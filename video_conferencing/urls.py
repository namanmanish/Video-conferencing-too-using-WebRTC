from django.urls import path
from .views import *

urlpatterns = [
    path('<str:room_id>', home_page, name="home_page"),
]
