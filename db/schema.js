const { pgTable, serial, text, integer, boolean, timestamp, unique, check } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

const registros = pgTable('registros', {
  id: serial('id').primaryKey(),
  folio: text('folio').unique().notNull(),
  nombre: text('nombre').notNull(),
  apellido: text('apellido').notNull(),
  email: text('email').notNull(),
  telefono: text('telefono').notNull(),
  adultos: integer('adultos').default(1),
  ninos: integer('ninos').default(0),
  trae_perro: boolean('trae_perro').default(false),
  nombre_perro: text('nombre_perro'),
  gano_rifa: boolean('gano_rifa').default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

const sellos = pgTable('sellos', {
  id: serial('id').primaryKey(),
  folio: text('folio').notNull().references(() => registros.folio),
  stand_num: integer('stand_num').notNull(),
  stamp_code: text('stamp_code').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  unique().on(t.folio, t.stand_num),
]);

const vendedores = pgTable('vendedores', {
  id: serial('id').primaryKey(),
  nombre: text('nombre').notNull(),
  email: text('email').unique().notNull(),
  telefono: text('telefono'),
  password_hash: text('password_hash').notNull(),
  stand_num: integer('stand_num').notNull(),
  es_admin: boolean('es_admin').default(false),
  es_subadmin: boolean('es_subadmin').default(false),
  activo: boolean('activo').default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

module.exports = { registros, sellos, vendedores };
