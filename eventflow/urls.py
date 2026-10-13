from django.contrib import admin
from django.urls import path, include
from rest_framework.authtoken import views as token_views

admin.site.site_header = 'EventFlow · Administración'
admin.site.site_title = 'EventFlow Admin'
admin.site.index_title = 'Centro de Control · Espacios y Recursos'

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('gestion_eventos.urls')),
    path('api/auth/', include('rest_framework.urls')),
    path('api-token-auth/', token_views.obtain_auth_token),
]
