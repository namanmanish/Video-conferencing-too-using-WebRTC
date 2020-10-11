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
    && pip install channels
EXPOSE 8000
CMD /bin/sh; \
    cd /home; \
    source webrtcenv/bin/activate; \
    cd WebRtc; \
    python manage.py runserver 0.0.0.0:8000;
