"""
URL configuration for project_4200 project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from visuals.views import dashboard, treemap_data, sankey_data, line_data, altair_histogram, altair_scatter, altair_bar_chart

urlpatterns = [
    path("admin/", admin.site.urls),
    path('', dashboard, name='dashboard'),  # Home Access dashboard (All data)
    path('treemap-data/', treemap_data, name='treemap_data'),
    path('sankey-data/', sankey_data, name='sankey_data'),
    path('line-data/', line_data, name = 'line_data'),
    path('histogram/', altair_histogram, name='altair_histogram'),
    path('scatter-data/', altair_scatter, name='scatter-data'),
    path('bar-chart/', altair_bar_chart, name='bar_chart_plot'),
]
