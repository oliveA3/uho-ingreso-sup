class SoftDeleteModelMixin:
    """Replaces the DRF default hard delete with a soft delete.

    Nomenclador catalogs are referenced by historical records (boletas,
    escalafones, planes de plaza, etc.) via PROTECT foreign keys, so a real
    row deletion either raises ProtectedError or, worse, would silently
    break referential integrity if the FK constraint were ever relaxed.
    Deactivating the record instead preserves that history.
    """

    active_field = "activa"

    def perform_destroy(self, instance):
        setattr(instance, self.active_field, False)
        instance.save(update_fields=[self.active_field])
