create table if not exists public.sound_library (
  id text primary key,
  label text not null,
  category text not null,
  preview_key text,
  vault_key text,
  base_freq double precision,
  description text,
  created_at timestamptz default now()
);

insert into public.sound_library (id, label, category, preview_key, vault_key, base_freq, description)
values
  ('instr_01', 'Crystal Harp', 'ether', 'preview/harp_ethereal.mp3', 'vault/harp_master.ogg', 432, 'The heart of the forest.'),
  ('instr_02', 'Shamanic Drum', 'earth', 'preview/drum_gaia.mp3', 'vault/drum_master.ogg', null, 'Deep grounding rhythm.'),
  ('instr_03', 'Koshi Air', 'air', 'preview/koshi_air.mp3', 'vault/koshi_master.ogg', 440, 'Whispers of the wind.'),
  ('instr_04', 'Forest Rain', 'water', 'preview/rain_soft.mp3', 'vault/rain_loop.ogg', null, 'Cleansing background texture.')
on conflict (id) do update set
  label = excluded.label,
  category = excluded.category,
  preview_key = excluded.preview_key,
  vault_key = excluded.vault_key,
  base_freq = excluded.base_freq,
  description = excluded.description;
