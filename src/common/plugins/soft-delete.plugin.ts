import { Schema } from 'mongoose';

/**
 * Soft Delete Plugin
 * Tüm query'lerde otomatik olarak silinmemiş kayıtları getirir.Burası bir middleware gibi düşünülebilir.
 */
export function softDeletePlugin(schema: Schema) {
  // find, findOne, findOneAndUpdate, findOneAndDelete için pre-hook
  schema.pre(['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete'], function () {
    // Eğer query'de zaten deletedAt veya deleted filtresi varsa, dokunmayalım.
    const query = this.getQuery();
    if (!query.deletedAt && !query.deleted) {
      this.where({ deletedAt: null, deleted: { $ne: true } });
    }
  });

  // countDocuments için de aynı filtreyi uyguluyoruz.
  schema.pre('countDocuments', function () {
    const query = this.getQuery();
    if (!query.deletedAt && !query.deleted) {
      this.where({ deletedAt: null, deleted: { $ne: true } });
    }
  });
}

