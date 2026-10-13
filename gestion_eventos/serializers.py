from decimal import Decimal, ROUND_DOWN
from rest_framework import serializers
from django.db import IntegrityError
from .models import Espacio, RecursoTecnico
import re


class EspacioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Espacio
        fields = '__all__'

    def validate_aforo_maximo(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError('El aforo máximo debe ser mayor que cero.')
        return value

    def validate_nombre(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('El nombre es obligatorio.')
        return value.strip()

    def validate_ubicacion_bloque(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('La ubicación/bloque es obligatorio.')
        return value.strip()


class RecursoTecnicoSerializer(serializers.ModelSerializer):
    espacio_detalle = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = RecursoTecnico
        fields = '__all__'

    def get_espacio_detalle(self, obj):
        if obj.espacio_id is None:
            return None
        return {
            'id': obj.espacio.id,
            'nombre': obj.espacio.nombre,
            'ubicacion_bloque': obj.espacio.ubicacion_bloque,
        }

    def validate_nombre_equipo(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('El nombre del equipo es obligatorio.')
        return value.strip()

    def validate_codigo_inventario(self, value):
        if not value:
            raise serializers.ValidationError('El código de inventario es obligatorio.')
        codigo = str(value).strip().upper()
        if not re.match(r'^EV-[A-Z]{3}-[0-9]{3}$', codigo):
            raise serializers.ValidationError('El código debe tener formato EV-AAA-000 (ej. EV-SON-001).')
        # Verificar unicidad (defensivo)
        qs = RecursoTecnico.objects.filter(codigo_inventario=codigo)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('El código de inventario ya existe.')
        return codigo

    def validate_cantidad_stock(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError('La cantidad en stock no puede ser negativa.')
        return value

    def validate_costo_alquiler_mantenimiento(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError('El costo debe ser mayor que cero.')
        # Asegurar máximo 2 decimales (formato decimal válido)
        try:
            d = Decimal(str(value))
        except Exception:
            raise serializers.ValidationError('El costo debe tener un formato decimal válido.')
        if d.as_tuple().exponent < -2:
            # Redondeo hacia abajo para forzar 2 decimales si viniera con más; pero validamos formato razonable
            raise serializers.ValidationError('El costo solo puede tener hasta 2 decimales.')
        return value

    def validate_espacio(self, value):
        if value is None:
            raise serializers.ValidationError('El espacio es obligatorio.')
        # Debe existir
        if not Espacio.objects.filter(pk=value.pk).exists():
            raise serializers.ValidationError('El espacio indicado no existe.')
        return value

    def validate(self, attrs):
        return attrs
