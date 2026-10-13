from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .models import Espacio, RecursoTecnico


class EspacioAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tester', password='pass123')
        self.token = Token.objects.create(user=self.user)
        self.url_espacios = '/api/espacios/'

    def test_crear_espacio_valido(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        data = {'nombre': 'Auditorio Central', 'ubicacion_bloque': 'Bloque A', 'aforo_maximo': 200, 'estado_operativo': 'OPERATIVO'}
        resp = self.client.post(self.url_espacios, data)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_rechazar_aforo_cero_negativo(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        resp = self.client.post(self.url_espacios, {'nombre': 'X', 'ubicacion_bloque': 'B', 'aforo_maximo': 0})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        resp = self.client.post(self.url_espacios, {'nombre': 'Y', 'ubicacion_bloque': 'B', 'aforo_maximo': -5})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class RecursoAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='tester2', password='pass123')
        self.token = Token.objects.create(user=self.user)
        self.espacio = Espacio.objects.create(nombre='Sala 1', ubicacion_bloque='Bloque A', aforo_maximo=50, estado_operativo='OPERATIVO')
        self.url_recursos = '/api/recursos/'
        self.url_espacios = '/api/espacios/'

    def test_crear_recurso_valido(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        data = {'nombre_equipo': 'Consola digital', 'codigo_inventario': 'EV-SON-001', 'costo_alquiler_mantenimiento': '250.00', 'cantidad_stock': 3, 'espacio': self.espacio.id}
        resp = self.client.post(self.url_recursos, data)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_rechazar_codigo_duplicado(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        data = {'nombre_equipo': 'A', 'codigo_inventario': 'EV-LUZ-001', 'costo_alquiler_mantenimiento': '100.00', 'cantidad_stock': 1, 'espacio': self.espacio.id}
        resp = self.client.post(self.url_recursos, data)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        resp2 = self.client.post(self.url_recursos, data)
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rechazar_costo_invalido(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        resp = self.client.post(self.url_recursos, {'nombre_equipo': 'X', 'codigo_inventario': 'EV-VID-001', 'costo_alquiler_mantenimiento': '-10.00', 'cantidad_stock': 1, 'espacio': self.espacio.id})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        resp = self.client.post(self.url_recursos, {'nombre_equipo': 'X', 'codigo_inventario': 'EV-VID-002', 'costo_alquiler_mantenimiento': '0.00', 'cantidad_stock': 1, 'espacio': self.espacio.id})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rechazar_espacio_inexistente(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        resp = self.client.post(self.url_recursos, {'nombre_equipo': 'X', 'codigo_inventario': 'EV-AUD-001', 'costo_alquiler_mantenimiento': '50.00', 'cantidad_stock': 1, 'espacio': 9999})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lecturas_publicas(self):
        resp = self.client.get(self.url_espacios)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        resp = self.client.get(self.url_recursos)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_bloqueo_sin_auth_escritura(self):
        resp = self.client.post(self.url_espacios, {'nombre': 'E', 'ubicacion_bloque': 'B', 'aforo_maximo': 10})
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        e = self.client.post(self.url_espacios, {'nombre': 'E2', 'ubicacion_bloque': 'B', 'aforo_maximo': 10})
        self.assertEqual(e.status_code, 201)
        eid = e.data['id']
        self.client.credentials()
        resp = self.client.put(f'{self.url_espacios}{eid}/', {'nombre': 'E3', 'ubicacion_bloque': 'B', 'aforo_maximo': 20})
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
        resp = self.client.patch(f'{self.url_espacios}{eid}/', {'aforo_maximo': 25})
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
        resp = self.client.delete(f'{self.url_espacios}{eid}/')
        self.assertIn(resp.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_operaciones_protegidas_con_token(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        resp = self.client.post(self.url_espacios, {'nombre': 'Sala 2', 'ubicacion_bloque': 'B', 'aforo_maximo': 30})
        self.assertEqual(resp.status_code, 201)
        eid = resp.data['id']
        resp = self.client.patch(f'{self.url_espacios}{eid}/', {'estado_operativo': 'MANTENIMIENTO'})
        self.assertIn(resp.status_code, [200, 202])

    def test_404_inexistente(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        resp = self.client.get('/api/espacios/9999/')
        self.assertEqual(resp.status_code, 404)
        resp = self.client.get('/api/recursos/9999/')
        self.assertEqual(resp.status_code, 404)

    def test_filtros_por_espacio_y_costos(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        e2 = Espacio.objects.create(nombre='Sala 2', ubicacion_bloque='Bloque B', aforo_maximo=40)
        self.client.post(self.url_recursos, {'nombre_equipo': 'Mic', 'codigo_inventario': 'EV-MIC-001', 'costo_alquiler_mantenimiento': '100.00', 'cantidad_stock': 2, 'espacio': self.espacio.id})
        self.client.post(self.url_recursos, {'nombre_equipo': 'Proy', 'codigo_inventario': 'EV-PRO-001', 'costo_alquiler_mantenimiento': '300.00', 'cantidad_stock': 1, 'espacio': e2.id})
        resp = self.client.get(self.url_recursos + '?espacio=' + str(self.espacio.id))
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(all(r['espacio'] == self.espacio.id for r in resp.data))
        resp = self.client.get(self.url_recursos + '?costo_min=200')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(all(float(r['costo_alquiler_mantenimiento']) >= 200 for r in resp.data))
        resp = self.client.get(self.url_recursos + '?costo_max=150')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(all(float(r['costo_alquiler_mantenimiento']) <= 150 for r in resp.data))
        resp = self.client.get(self.url_recursos + '?costo_min=100&costo_max=300')
        self.assertEqual(resp.status_code, 200)
