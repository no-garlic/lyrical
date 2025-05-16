#!/bin/sh

rm -rf db.sqlite3
python manage.py makemigrations lyrical
python manage.py migrate
