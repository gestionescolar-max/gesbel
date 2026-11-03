-- ============================================================================
-- Preinscripción a ofertas de Formación Profesional — ciclo lectivo 2027
-- ----------------------------------------------------------------------------
-- Ejecutar en el SQL Editor de Supabase (o con `supabase db push` si usás
-- migrations). Idempotente: se puede correr más de una vez sin errores.
-- ============================================================================

-- 1) Ciclo lectivo 2027 (si todavía no existe) --------------------------------
insert into ciclos_lectivos (anio)
select 2027
where not exists (select 1 from ciclos_lectivos where anio = 2027);

-- 2) Tabla de ofertas de FP ----------------------------------------------------
-- Una oferta = un curso/taller de Formación Profesional que la escuela propone
-- para un ciclo lectivo (por ej. "Soldadura básica 2027", "Programación…").
create table if not exists ofertas_fp (
  id                serial primary key,
  titulo            text not null,                 -- nombre de la oferta / taller
  especialidad      text,                          -- área: industria, informática…
  cupo              integer,                       -- máximo de inscriptos (null = sin límite)
  horario           text,                          -- p.ej. "Martes y jueves 18 a 21 hs"
  aula              text,
  preceptor_id      integer references profesores(id), -- preceptor responsable
  ciclo_lectivo_id  integer references ciclos_lectivos(id),
  plan_id           integer references planes_estudio(id), -- plan/técnica de referencia (opcional)
  descripcion       text,
  activa            boolean not null default true, -- se muestra o no en la pantalla
  created_at        timestamptz not null default now()
);

-- 3) Tabla de preinscripciones -------------------------------------------------
-- Alumnos preinscriptos a una oferta. El estado permite manejar el flujo
-- pendiente -> confirmada -> pasada a curso (inscripción definitiva).
create table if not exists preinscripciones_fp (
  id             serial primary key,
  oferta_id      integer not null references ofertas_fp(id) on delete cascade,
  alumno_id      integer not null references alumnos(id)    on delete cascade,
  estado         text not null default 'pendiente'
                 check (estado in ('pendiente', 'confirmada', 'anulada')),
  curso_id       integer references cursos(id),   -- curso generado al confirmar
  fecha          timestamptz not null default now(),
  observaciones  text,
  unique (oferta_id, alumno_id)                    -- un alumno no se preinscribe dos veces a la misma oferta
);

create index if not exists idx_preinscripciones_fp_oferta on preinscripciones_fp (oferta_id);

-- 4) RLS: la app usa la anon key + sesión del preceptor ------------------------
alter table ofertas_fp enable row level security;
alter table preinscripciones_fp enable row level security;

drop policy if exists "Lectura publica de ofertas FP" on ofertas_fp;
create policy "Lectura publica de ofertas FP" on ofertas_fp for select using (true);

drop policy if exists "Gestion de ofertas FP" on ofertas_fp;
create policy "Gestion de ofertas FP" on ofertas_fp for all
  using (exists (select 1 from perfiles p
                 where p.user_id = auth.uid() and p.rol in ('preceptor', 'directivo')))
  with check (exists (select 1 from perfiles p
                 where p.user_id = auth.uid() and p.rol in ('preceptor', 'directivo')));

drop policy if exists "Gestion de preinscripciones FP" on preinscripciones_fp;
create policy "Gestion de preinscripciones FP" on preinscripciones_fp for all
  using (exists (select 1 from perfiles p
                 where p.user_id = auth.uid() and p.rol in ('preceptor', 'directivo')))
  with check (exists (select 1 from perfiles p
                 where p.user_id = auth.uid() and p.rol in ('preceptor', 'directivo')));
