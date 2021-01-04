from django.urls import path
from .views import *

urlpatterns = [
    path('recorder/<str:user_id>/', put_recording, name="put_recording"),
    path('<str:room_id>/<str:user_name>/', home_page, name="home_page")
]
