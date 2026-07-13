CREATE TABLE "registros" (
	"id" serial PRIMARY KEY NOT NULL,
	"folio" text NOT NULL,
	"nombre" text NOT NULL,
	"apellido" text NOT NULL,
	"email" text NOT NULL,
	"telefono" text NOT NULL,
	"adultos" integer DEFAULT 1,
	"ninos" integer DEFAULT 0,
	"trae_perro" boolean DEFAULT false,
	"nombre_perro" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "registros_folio_unique" UNIQUE("folio")
);
--> statement-breakpoint
CREATE TABLE "sellos" (
	"id" serial PRIMARY KEY NOT NULL,
	"folio" text NOT NULL,
	"stand_num" integer NOT NULL,
	"stamp_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "sellos_folio_stand_num_unique" UNIQUE("folio","stand_num")
);
--> statement-breakpoint
CREATE TABLE "vendedores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"stand_num" integer NOT NULL,
	"es_admin" boolean DEFAULT false,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "vendedores_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "sellos" ADD CONSTRAINT "sellos_folio_registros_folio_fk" FOREIGN KEY ("folio") REFERENCES "public"."registros"("folio") ON DELETE no action ON UPDATE no action;