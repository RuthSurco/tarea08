const API_BASE_URL = 'http://127.0.0.1:8000/api';

const els = {
    apiStatus: document.getElementById('api-status'),
    authStatus: document.getElementById('auth-status'),
    navBtns: Array.from(document.querySelectorAll('.nav-btn')),
    panels: Array.from(document.querySelectorAll('.panel')),
    // resumen
    kpiTotal: document.getElementById('kpi-total-espacios'),
    kpiOperativos: document.getElementById('kpi-operativos'),
    kpiRecursos: document.getElementById('kpi-recursos'),
    kpiStock: document.getElementById('kpi-stock'),
    resumenEspacios: document.getElementById('resumen-espacios'),
    resumenRecursosTable: document.querySelector('#resumen-recursos-table tbody'),
    // espacios
    formEspacio: document.getElementById('form-espacio'),
    espNombre: document.getElementById('esp-nombre'),
    espUbicacion: document.getElementById('esp-ubicacion'),
    espAforo: document.getElementById('esp-aforo'),
    espEstado: document.getElementById('esp-estado'),
    btnGuardarEspacio: document.getElementById('btn-guardar-espacio'),
    btnCancelarEspacio: document.getElementById('btn-cancelar-espacio'),
    btnRecargarEspacios: document.getElementById('btn-recargar-espacios'),
    msgEspacio: document.getElementById('msg-espacio'),
    searchEspacios: document.getElementById('search-espacios'),
    tablaEspacios: document.querySelector('#tabla-espacios tbody'),
    // recursos
    formRecurso: document.getElementById('form-recurso'),
    recNombre: document.getElementById('rec-nombre'),
    recCodigo: document.getElementById('rec-codigo'),
    recEspacio: document.getElementById('rec-espacio'),
    recCosto: document.getElementById('rec-costo'),
    recStock: document.getElementById('rec-stock'),
    btnGuardarRecurso: document.getElementById('btn-guardar-recurso'),
    btnCancelarRecurso: document.getElementById('btn-cancelar-recurso'),
    btnRecargarRecursos: document.getElementById('btn-recargar-recursos'),
    msgRecurso: document.getElementById('msg-recurso'),
    searchRecursos: document.getElementById('search-recursos'),
    filtroCostoMin: document.getElementById('filtro-costo-min'),
    filtroCostoMax: document.getElementById('filtro-costo-max'),
    filtroEspacio: document.getElementById('filtro-espacio'),
    tablaRecursos: document.querySelector('#tabla-recursos tbody'),
    // actividad
    apiBaseUrl: document.getElementById('api-base-url'),
    lastActivity: document.getElementById('last-activity'),
    btnTestApi: document.getElementById('btn-test-api'),
    msgApi: document.getElementById('msg-api'),
    authUser: document.getElementById('auth-user'),
    authPass: document.getElementById('auth-pass'),
    btnObtenerToken: document.getElementById('btn-obtener-token'),
    btnLimpiarToken: document.getElementById('btn-limpiar-token'),
    msgAuth: document.getElementById('msg-auth'),
    tokenPreview: document.getElementById('token-preview'),
    toast: document.getElementById('toast'),
};

let token = localStorage.getItem('eventflow_token') || '';
let espacios = [];
let recursos = [];
let editingEspacioId = null;
let editingRecursoId = null;

function toast(msg, type = 'info') {
    els.toast.textContent = msg;
    els.toast.className = 'toast show ' + (type === 'error' ? 'error' : type === 'success' ? 'success' : '');
    setTimeout(() => { els.toast.className = 'toast'; }, 2800);
}

function setApiStatus(text) {
    els.apiStatus.textContent = 'API: ' + text;
}

function setAuthStatus(text) {
    els.authStatus.textContent = 'Auth: ' + text;
}

function updateTokenUI() {
    if (token) {
        els.tokenPreview.textContent = token;
        setAuthStatus('Token activo');
    } else {
        els.tokenPreview.textContent = 'Sin token';
        setAuthStatus('Anónimo');
    }
}

function headers(auth = false) {
    const h = { 'Content-Type': 'application/json' };
    if (auth && token) h['Authorization'] = 'Token ' + token;
    return h;
}

function now() {
    return new Date().toLocaleTimeString();
}

function switchPanel(target) {
    els.navBtns.forEach(b => b.classList.toggle('active', b.dataset.target === target));
    els.panels.forEach(p => p.classList.toggle('active', p.id === target));
}

els.navBtns.forEach(b => b.addEventListener('click', () => switchPanel(b.dataset.target)));

async function fetchJSON(url, opts = {}) {
    try {
        const res = await fetch(url, opts);
        const ct = res.headers.get('content-type') || '';
        let data = null;
        if (ct.includes('application/json')) {
            data = await res.json();
        } else {
            data = await res.text();
        }
        return { ok: res.ok, status: res.status, data };
    } catch (e) {
        return { ok: false, status: 0, data: e.message || 'Error de red' };
    }
}

async function cargarEspacios() {
    const r = await fetchJSON(API_BASE_URL + '/espacios/?search=' + encodeURIComponent(els.searchEspacios.value || ''));
    if (r.ok && Array.isArray(r.data)) {
        espacios = r.data;
        renderEspacios();
        poblarSelectEspacios();
        actualizarResumen();
    } else {
        toast('Error cargando espacios: ' + (r.data?.detail || r.status), 'error');
    }
    els.lastActivity.textContent = now();
}

async function cargarRecursos() {
    const params = new URLSearchParams();
    if (els.searchRecursos.value) params.set('search', els.searchRecursos.value);
    if (els.filtroEspacio.value) params.set('espacio', els.filtroEspacio.value);
    if (els.filtroCostoMin.value) params.set('costo_min', els.filtroCostoMin.value);
    if (els.filtroCostoMax.value) params.set('costo_max', els.filtroCostoMax.value);
    const qs = params.toString() ? ('?' + params.toString()) : '';
    const r = await fetchJSON(API_BASE_URL + '/recursos/' + qs);
    if (r.ok && Array.isArray(r.data)) {
        recursos = r.data;
        renderRecursos();
        actualizarResumen();
    } else {
        toast('Error cargando recursos: ' + (r.data?.detail || r.status), 'error');
    }
    els.lastActivity.textContent = now();
}

function renderEspacios() {
    els.tablaEspacios.innerHTML = '';
    if (espacios.length === 0) {
        els.tablaEspacios.innerHTML = '<tr><td colspan="6" class="muted">Sin espacios</td></tr>';
        return;
    }
    espacios.forEach(e => {
        const tr = document.createElement('tr');
        const estado = e.estado_operativo.toLowerCase();
        const badge = estado === 'operativo' ? 'operativo' : estado === 'mantenimiento' ? 'mantenimiento' : 'fuera';
        tr.innerHTML = `<td>${e.id}</td><td>${escapeHtml(e.nombre)}</td><td>${escapeHtml(e.ubicacion_bloque)}</td><td>${e.aforo_maximo}</td><td><span class="badge ${badge}">${escapeHtml(e.estado_operativo)}</span></td><td class="actions-cell"><button class="btn small" data-action="edit" data-id="${e.id}">Editar</button> <button class="btn small danger" data-action="delete" data-id="${e.id}">Eliminar</button></td>`;
        els.tablaEspacios.appendChild(tr);
    });
}

function renderRecursos() {
    els.tablaRecursos.innerHTML = '';
    if (recursos.length === 0) {
        els.tablaRecursos.innerHTML = '<tr><td colspan="7" class="muted">Sin recursos</td></tr>';
        return;
    }
    recursos.forEach(r => {
        const tr = document.createElement('tr');
        const espacio = r.espacio_detalle ? r.espacio_detalle.nombre : ('#' + r.espacio);
        tr.innerHTML = `<td>${r.id}</td><td>${escapeHtml(r.codigo_inventario)}</td><td>${escapeHtml(r.nombre_equipo)}</td><td>${formatMoney(r.costo_alquiler_mantenimiento)}</td><td>${r.cantidad_stock}</td><td>${escapeHtml(espacio)}</td><td class="actions-cell"><button class="btn small" data-action="edit" data-id="${r.id}">Editar</button> <button class="btn small danger" data-action="delete" data-id="${r.id}">Eliminar</button></td>`;
        els.tablaRecursos.appendChild(tr);
    });
}

function renderResumenEspacios() {
    els.resumenEspacios.innerHTML = '';
    espacios.slice(0, 6).forEach(e => {
        const estado = e.estado_operativo.toLowerCase();
        const badge = estado === 'operativo' ? 'operativo' : estado === 'mantenimiento' ? 'mantenimiento' : 'fuera';
        const div = document.createElement('div');
        div.className = 'espacio-chip';
        div.innerHTML = `<h4>${escapeHtml(e.nombre)}</h4><div class="meta">${escapeHtml(e.ubicacion_bloque)} · Aforo ${e.aforo_maximo} · <span class="badge ${badge}">${escapeHtml(e.estado_operativo)}</span></div>`;
        els.resumenEspacios.appendChild(div);
    });
}

function renderResumenRecursos() {
    els.resumenRecursosTable.innerHTML = '';
    recursos.slice(0, 8).forEach(r => {
        const tr = document.createElement('tr');
        const espacio = r.espacio_detalle ? r.espacio_detalle.nombre : ('#' + r.espacio);
        tr.innerHTML = `<td>${escapeHtml(r.codigo_inventario)}</td><td>${escapeHtml(r.nombre_equipo)}</td><td>${r.cantidad_stock}</td><td>${formatMoney(r.costo_alquiler_mantenimiento)}</td><td>${escapeHtml(espacio)}</td>`;
        els.resumenRecursosTable.appendChild(tr);
    });
}

function poblarSelectEspacios() {
    // mantener valor actual si existe
    const current = els.recEspacio.value;
    els.recEspacio.innerHTML = '<option value="">Seleccionar espacio</option>';
    espacios.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.nombre + ' (' + e.ubicacion_bloque + ')';
        els.recEspacio.appendChild(opt);
    });
    if (current) els.recEspacio.value = current;

    // filtro
    const currentF = els.filtroEspacio.value;
    els.filtroEspacio.innerHTML = '<option value="">Todos los espacios</option>';
    espacios.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.nombre;
        els.filtroEspacio.appendChild(opt);
    });
    if (currentF) els.filtroEspacio.value = currentF;
}

function actualizarResumen() {
    els.kpiTotal.textContent = espacios.length;
    els.kpiOperativos.textContent = espacios.filter(e => e.estado_operativo === 'OPERATIVO').length;
    els.kpiRecursos.textContent = recursos.length;
    els.kpiStock.textContent = recursos.reduce((s, r) => s + (Number(r.cantidad_stock) || 0), 0);
    renderResumenEspacios();
    renderResumenRecursos();
}

function formatMoney(v) {
    const n = Number(v);
    if (isNaN(n)) return v;
    return 'S/ ' + n.toFixed(2);
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function extractError(r, fallback) {
    let msg = fallback;
    if (r.data) {
        if (typeof r.data === 'string') msg = r.data;
        else if (r.data.detail) msg = r.data.detail;
        else {
            const parts = [];
            for (const k in r.data) parts.push(k + ': ' + (Array.isArray(r.data[k]) ? r.data[k].join(', ') : r.data[k]));
            msg = parts.join(' | ');
        }
    }
    return msg;
}

function iniciarEdicionEspacio(id) {
    const e = espacios.find(x => x.id === id);
    if (!e) return;
    editingEspacioId = id;
    els.espNombre.value = e.nombre;
    els.espUbicacion.value = e.ubicacion_bloque;
    els.espAforo.value = e.aforo_maximo;
    els.espEstado.value = e.estado_operativo;
    els.btnGuardarEspacio.textContent = 'Actualizar Espacio';
    els.btnCancelarEspacio.hidden = false;
    els.msgEspacio.textContent = 'Editando espacio #' + id;
    switchPanel('panel-espacios');
    els.formEspacio.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelarEdicionEspacio() {
    editingEspacioId = null;
    els.formEspacio.reset();
    els.btnGuardarEspacio.textContent = 'Guardar Espacio';
    els.btnCancelarEspacio.hidden = true;
    els.msgEspacio.textContent = '';
}

function iniciarEdicionRecurso(id) {
    const r = recursos.find(x => x.id === id);
    if (!r) return;
    editingRecursoId = id;
    els.recNombre.value = r.nombre_equipo;
    els.recCodigo.value = r.codigo_inventario;
    els.recCosto.value = r.costo_alquiler_mantenimiento;
    els.recStock.value = r.cantidad_stock;
    els.recEspacio.value = r.espacio;
    els.btnGuardarRecurso.textContent = 'Actualizar Recurso';
    els.btnCancelarRecurso.hidden = false;
    els.msgRecurso.textContent = 'Editando recurso #' + id;
    switchPanel('panel-inventario');
    els.formRecurso.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelarEdicionRecurso() {
    editingRecursoId = null;
    els.formRecurso.reset();
    els.btnGuardarRecurso.textContent = 'Guardar Recurso';
    els.btnCancelarRecurso.hidden = true;
    els.msgRecurso.textContent = '';
}

async function eliminarEspacio(id) {
    if (!token) {
        toast('Necesitas un token (pestaña Actividad) para eliminar', 'error');
        return;
    }
    const e = espacios.find(x => x.id === id);
    const nombre = e ? e.nombre : ('#' + id);
    if (!confirm('¿Eliminar el espacio "' + nombre + '"? Esta acción no se puede deshacer.')) return;
    const r = await fetchJSON(API_BASE_URL + '/espacios/' + id + '/', { method: 'DELETE', headers: headers(true) });
    if (r.status === 204) {
        toast('Espacio eliminado', 'success');
        if (editingEspacioId === id) cancelarEdicionEspacio();
        await cargarEspacios();
    } else {
        const msg = extractError(r, 'No se pudo eliminar el espacio (código ' + r.status + ')');
        els.msgEspacio.textContent = msg;
        toast(msg, 'error');
    }
    els.lastActivity.textContent = now();
}

async function eliminarRecurso(id) {
    if (!token) {
        toast('Necesitas un token (pestaña Actividad) para eliminar', 'error');
        return;
    }
    const r0 = recursos.find(x => x.id === id);
    const nombre = r0 ? r0.nombre_equipo : ('#' + id);
    if (!confirm('¿Eliminar el recurso "' + nombre + '"? Esta acción no se puede deshacer.')) return;
    const r = await fetchJSON(API_BASE_URL + '/recursos/' + id + '/', { method: 'DELETE', headers: headers(true) });
    if (r.status === 204) {
        toast('Recurso eliminado', 'success');
        if (editingRecursoId === id) cancelarEdicionRecurso();
        await cargarRecursos();
    } else {
        const msg = extractError(r, 'No se pudo eliminar el recurso');
        els.msgRecurso.textContent = msg;
        toast(msg, 'error');
    }
    els.lastActivity.textContent = now();
}

// Forms
els.formEspacio.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editing = editingEspacioId !== null;
    els.btnGuardarEspacio.disabled = true;
    els.msgEspacio.textContent = 'Guardando...';
    const payload = {
        nombre: els.espNombre.value.trim(),
        ubicacion_bloque: els.espUbicacion.value.trim(),
        aforo_maximo: Number(els.espAforo.value),
        estado_operativo: els.espEstado.value,
    };
    const url = editing ? (API_BASE_URL + '/espacios/' + editingEspacioId + '/') : (API_BASE_URL + '/espacios/');
    const r = await fetchJSON(url, {
        method: editing ? 'PUT' : 'POST',
        headers: headers(true),
        body: JSON.stringify(payload)
    });
    els.btnGuardarEspacio.disabled = false;
    if (r.ok && (r.status === 201 || r.status === 200)) {
        els.msgEspacio.textContent = editing ? 'Espacio actualizado correctamente' : 'Espacio creado correctamente';
        toast(editing ? 'Espacio actualizado' : 'Espacio creado', 'success');
        cancelarEdicionEspacio();
        await cargarEspacios();
    } else {
        const msg = extractError(r, editing ? 'Error al actualizar espacio' : 'Error al crear espacio');
        els.msgEspacio.textContent = msg;
        toast(msg, 'error');
    }
    els.lastActivity.textContent = now();
});

els.formRecurso.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editing = editingRecursoId !== null;
    els.btnGuardarRecurso.disabled = true;
    els.msgRecurso.textContent = 'Guardando...';
    const payload = {
        nombre_equipo: els.recNombre.value.trim(),
        codigo_inventario: els.recCodigo.value.trim().toUpperCase(),
        costo_alquiler_mantenimiento: els.recCosto.value,
        cantidad_stock: Number(els.recStock.value),
        espacio: els.recEspacio.value ? Number(els.recEspacio.value) : null,
    };
    const url = editing ? (API_BASE_URL + '/recursos/' + editingRecursoId + '/') : (API_BASE_URL + '/recursos/');
    const r = await fetchJSON(url, {
        method: editing ? 'PUT' : 'POST',
        headers: headers(true),
        body: JSON.stringify(payload)
    });
    els.btnGuardarRecurso.disabled = false;
    if (r.ok && (r.status === 201 || r.status === 200)) {
        els.msgRecurso.textContent = editing ? 'Recurso actualizado correctamente' : 'Recurso creado correctamente';
        toast(editing ? 'Recurso actualizado' : 'Recurso creado', 'success');
        cancelarEdicionRecurso();
        await cargarRecursos();
    } else {
        const msg = extractError(r, editing ? 'Error al actualizar recurso' : 'Error al crear recurso');
        els.msgRecurso.textContent = msg;
        toast(msg, 'error');
    }
    els.lastActivity.textContent = now();
});

els.btnRecargarEspacios.addEventListener('click', cargarEspacios);
els.btnRecargarRecursos.addEventListener('click', cargarRecursos);
els.btnCancelarEspacio.addEventListener('click', cancelarEdicionEspacio);
els.btnCancelarRecurso.addEventListener('click', cancelarEdicionRecurso);

els.tablaEspacios.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.action === 'edit') iniciarEdicionEspacio(id);
    else if (btn.dataset.action === 'delete') eliminarEspacio(id);
});

els.tablaRecursos.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.action === 'edit') iniciarEdicionRecurso(id);
    else if (btn.dataset.action === 'delete') eliminarRecurso(id);
});
els.searchEspacios.addEventListener('input', () => setTimeout(cargarEspacios, 350));
els.searchRecursos.addEventListener('input', () => setTimeout(cargarRecursos, 350));
els.filtroEspacio.addEventListener('change', cargarRecursos);
els.filtroCostoMin.addEventListener('input', () => setTimeout(cargarRecursos, 350));
els.filtroCostoMax.addEventListener('input', () => setTimeout(cargarRecursos, 350));

els.btnTestApi.addEventListener('click', async () => {
    els.msgApi.textContent = 'Probando...';
    const r = await fetchJSON(API_BASE_URL + '/espacios/');
    if (r.ok) {
        els.msgApi.textContent = 'GET /api/espacios/ OK (' + (Array.isArray(r.data) ? r.data.length : 0) + ' elementos)';
        toast('API responde OK', 'success');
        setApiStatus('OK');
    } else {
        els.msgApi.textContent = 'Error: ' + r.status + ' - ' + (r.data?.detail || r.data);
        toast('API error', 'error');
        setApiStatus('ERROR');
    }
    els.lastActivity.textContent = now();
});

els.btnObtenerToken.addEventListener('click', async () => {
    els.msgAuth.textContent = 'Solicitando token...';
    const r = await fetchJSON(API_BASE_URL.replace('/api', '') + '/api-token-auth/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: els.authUser.value.trim(), password: els.authPass.value })
    });
    if (r.ok && r.data && r.data.token) {
        token = r.data.token;
        localStorage.setItem('eventflow_token', token);
        els.msgAuth.textContent = 'Token obtenido correctamente';
        toast('Token obtenido', 'success');
        updateTokenUI();
    } else {
        els.msgAuth.textContent = 'Error: ' + (r.data?.non_field_errors?.join(', ') || r.data?.detail || 'Credenciales inválidas');
        toast('Error obteniendo token', 'error');
    }
});

els.btnLimpiarToken.addEventListener('click', () => {
    token = '';
    localStorage.removeItem('eventflow_token');
    updateTokenUI();
    toast('Token limpiado', 'info');
});

function init() {
    els.apiBaseUrl.textContent = API_BASE_URL;
    updateTokenUI();
    setApiStatus('Desconocido');
    cargarEspacios();
    cargarRecursos();
    switchPanel('panel-resumen');
}

init();
