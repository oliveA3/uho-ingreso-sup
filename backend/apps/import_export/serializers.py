from rest_framework import serializers

class ExcelUploadResponseSerializer(serializers.Serializer):
    inserted = serializers.IntegerField()
    updated = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.DictField(), allow_empty=True)