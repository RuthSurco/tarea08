from django.core.exceptions import ValidationError
from django.db import models
import re

class Espacio(models.Model):
    ESTADO_CHOICES = [
        ('OPERATIVO', 'OPERATIVO'),
        ('MANTENIMIENTO', 'MANTENIMIENTO'),
        ('FUERA_DE_SERVICIO', 'FUERA_DE_SERVICIO'),
    ]

    nombre = models.CharField(max_length=120, verbose_name='Nombre del espacio')
    ubicacion_bloque = models.CharField(max_length=80, verbose_name='Ubicación/Bloque')
    aforo_maximo = models.PositiveIntegerField(verbose_name='Aforo máximo')
    estado_operativo = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='OPERATIVO', verbose_name='Estado operativo')
    creado_en = models.DateTimeField(auto_now_add=True, null=True)
    actualizado_en = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        verbose_name = 'Espacio'
        verbose_name_plural = 'Espacios'
        ordering = ['nombre']

    def clean(self):
        super().clean()
        if self.aforo_maximo is not None and self.aforo_maximo <= 0:
            raise ValidationError({'aforo_maximo': 'El aforo máximo debe ser mayor que cero.'})

    def __str__(self):
        return f"{self.nombre} ({self.ubicacion_bloque})"


class RecursoTecnico(models.Model):
    nombre_equipo = models.CharField(max_length=120, verbose_name='Nombre del equipo')
    codigo_inventario = models.CharField(max_length=20, unique=True, verbose_name='Código patrimonial')
    costo_alquiler_mantenimiento = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Costo alquiler/mantenimiento')
    cantidad_stock = models.PositiveIntegerField(default=0, verbose_name='Cantidad en stock')
    espacio = models.ForeignKey(Espacio, on_delete=models.PROTECT, related_name='recursos_tecnicos', verbose_name='Espacio')

    class Meta:
        verbose_name = 'Recurso Técnico'
        verbose_name_plural = 'Recursos Técnicos'
        ordering = ['nombre_equipo']

    def clean(self):
        super().clean()
        # Validaciones defensivas
        if self.costo_alquiler_mantenimiento is not None and self.costo_alquiler_mantenimiento <= 0:
            raise ValidationError({'costo_alquiler_mantenimiento': 'El costo debe ser mayor que cero.'})
        if self.cantidad_stock is not None and self.cantidad_stock < 0:
            raise ValidationError({'cantidad_stock': 'La cantidad en stock no puede ser negativa.'})
        if self.codigo_inventario:
            codigo = self.codigo_inventario.strip().upper()
            if not re.match(r'^EV-[A-Z]{3}-[0-9]{3}$', codigo):
                raise ValidationError({'codigo_inventario': 'El código debe tener formato EV-AAA-000 (ej. EV-SON-001).'})
            # Normalizar si es instancia modificada
            self.codigo_inventario = codigo
        if not self.nombre_equipo or not self.nombre_equipo.strip():
            raise ValidationError({'nombre_equipo': 'El nombre del equipo es obligatorio.'})

    def __str__(self):
        return f"{self.codigo_inventario} - {self.nombre_equipo}"
