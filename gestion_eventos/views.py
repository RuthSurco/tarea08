from django.db.models import Q, ProtectedError
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Espacio, RecursoTecnico
from .serializers import EspacioSerializer, RecursoTecnicoSerializer


class EspacioViewSet(viewsets.ModelViewSet):
    queryset = Espacio.objects.all()
    serializer_class = EspacioSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(nombre__icontains=search) | Q(ubicacion_bloque__icontains=search))
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar este espacio porque tiene recursos técnicos asociados."},
                status=status.HTTP_409_CONFLICT
            )


class RecursoTecnicoViewSet(viewsets.ModelViewSet):
    queryset = RecursoTecnico.objects.select_related('espacio').all()
    serializer_class = RecursoTecnicoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        espacio_id = params.get('espacio')
        if espacio_id is not None:
            try:
                qs = qs.filter(espacio_id=int(espacio_id))
            except ValueError:
                pass

        costo_min = params.get('costo_min')
        if costo_min is not None:
            try:
                qs = qs.filter(costo_alquiler_mantenimiento__gte=float(costo_min))
            except ValueError:
                pass

        costo_max = params.get('costo_max')
        if costo_max is not None:
            try:
                qs = qs.filter(costo_alquiler_mantenimiento__lte=float(costo_max))
            except ValueError:
                pass

        search = params.get('search')
        if search:
            qs = qs.filter(Q(nombre_equipo__icontains=search) | Q(codigo_inventario__icontains=search.upper()) | Q(espacio__nombre__icontains=search))
        return qs
