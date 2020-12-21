from django.http import HttpResponse
from django.shortcuts import render
from .models import *
import os

# Create your views here.

def put_recording(request,user_id):
    upload_file = request.FILES['drive_file']
    if upload_file:
        filename = request.POST['filename']
        tmp = '/home/WebRTC/video_conferencing/recorded_videos'
        target = os.path.join(tmp, filename)
        with open(target,'wb+') as f:
            for i in upload_file.chunks():
                f.write(i)
        # print('ls /home/WebRTC/video_conferencing/recorded_videos')
        return HttpResponse(status=200)
    else:
        return HttpResponse(status=500)

def home_page(request,room_id,user_name):
    print('hellow')
    return render(request, 'video_conferencing/home.html',{'room_id':room_id,'user_name':user_name})