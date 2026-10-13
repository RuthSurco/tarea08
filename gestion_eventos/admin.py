from django.contrib import admin
from .models import Espacio, RecursoTecnico


@admin.register(Espacio)
class EspacioAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'ubicacion_bloque', 'aforo_maximo', 'estado_operativo', 'creado_en', 'actualizado_en')
    search_fields = ('nombre', 'ubicacion_bloque')
    list_filter = ('estado_operativo',)
    list_editable = ('estado_operativo',)
    date_hierarchy = 'creado_en'
    ordering = ('nombre',)
    list_per_page = 25
    save_on_top = True


@admin.register(RecursoTecnico)
class RecursoTecnicoAdmin(admin.ModelAdmin):
    list_display = ('id', 'codigo_inventario', 'nombre_equipo', 'costo_alquiler_mantenimiento', 'cantidad_stock', 'espacio')
    search_fields = ('codigo_inventario', 'nombre_equipo', 'espacio__nombre')
    list_filter = ('espacio',)
    list_editable = ('cantidad_stock',)
    ordering = ('codigo_inventario',)
    list_select_related = ('espacio',)
    autocomplete_fields = ('espacio',)
    list_per_page = 25
    save_on_top = True
