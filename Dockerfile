FROM python:3.6-alpine
WORKDIR /home/
RUN apk update  \
    && apk add build-base \
    && apk add --no-cache libressl-dev musl-dev libffi-dev \
    && apk add py3-pip \
    && pip install virtualenv \
    && virtualenv webrtcenv \
    && source webrtcenv/bin/activate \
    && pip install Django==2.2 \
    && pip install channels==2.4 \
    && pip install channels_redis==3.1
EXPOSE 8000
WORKDIR /home/
RUN mkdir WebRTC
CMD /bin/sh; \
    cd /home; \
    source /home/webrtcenv/bin/activate; \
    python /home/WebRTC/manage.py runserver 0.0.0.0:8000;
