create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null unique,
  locale text not null default 'de-DE',
  source text not null default 'homepage',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in (
    'finder_completed',
    'product_opened',
    'comparison_opened',
    'favorite_toggled',
    'shopping_list_toggled',
    'affiliate_clicked',
    'newsletter_submitted'
  )),
  session_id text,
  path text,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table newsletter_subscribers enable row level security;
alter table analytics_events enable row level security;

create index if not exists analytics_events_name_created_idx
  on analytics_events(event_name, created_at desc);
create index if not exists analytics_events_entity_idx
  on analytics_events(entity_type, entity_id, created_at desc);

drop trigger if exists set_newsletter_subscribers_updated_at on newsletter_subscribers;
create trigger set_newsletter_subscribers_updated_at
  before update on newsletter_subscribers
  for each row execute function set_updated_at();

insert into categories (slug, label, intent, description, ranking_attributes)
values
  ('hafermilch', 'Hafermilch', 'Pflanzliche Drinks für Kaffee, Müsli und Alltag.', 'Haferdrinks werden nach Zucker, Zutaten, Protein, Salz und Datenqualität bewertet.', '["wenig-zucker", "beste-wahl"]'::jsonb),
  ('proteinriegel', 'Proteinriegel', 'Proteinreiche Snacks mit nachvollziehbarer Makro-Balance.', 'Bei Proteinriegeln zählen Protein, Zucker, Zutatenlänge und erkennbare Süßungsmittel.', '["proteinreich", "wenig-zucker"]'::jsonb),
  ('muesli', 'Müsli', 'Müslis mit weniger Zucker, Ballaststoffen und klaren Zutaten.', 'Müslis werden im Kontext von Zucker, Protein, Ballaststoffen und Zutatenqualität verglichen.', '["wenig-zucker", "beste-wahl"]'::jsonb),
  ('joghurt-skyr', 'Joghurt und Skyr', 'Milchprodukte mit viel Protein und wenig zugesetztem Zucker.', 'Joghurt, Skyr und Quark werden nach Protein, Zucker, Fett, Zutaten und Allergenen bewertet.', '["proteinreich", "wenig-zucker"]'::jsonb),
  ('vegane-snacks', 'Vegane Snacks', 'Pflanzliche Snacks mit besserer Nährwert-Balance.', 'Vegan ist ein Filter, kein Gesundheitsversprechen. Entscheidend bleiben Zucker, Salz, Fett und Zutaten.', '["vegan", "beste-wahl"]'::jsonb),
  ('fruehstueckscerealien', 'Frühstückscerealien', 'Cerealien mit weniger Zucker und besserer Alltagstauglichkeit.', 'Flakes, Crunch und Cerealien werden nach Zucker, Protein, Salz und Zutatenqualität eingeordnet.', '["wenig-zucker", "familie"]'::jsonb),
  ('pflanzliche-joghurts', 'Pflanzliche Joghurts', 'Vegane Joghurtalternativen mit ausgewogenen Nährwerten.', 'Pflanzliche Joghurtalternativen werden nach Zucker, Protein, Zutaten und veganer Kennzeichnung verglichen.', '["wenig-zucker", "beste-wahl"]'::jsonb),
  ('brotaufstriche', 'Brotaufstriche', 'Süß und herzhaft streichen, mit klarer Zutatenentscheidung.', 'Aufstriche werden nach Zucker, Salz, gesättigten Fettsäuren und Zutatenqualität bewertet.', '["gute-zutaten", "beste-wahl"]'::jsonb),
  ('nussmuse', 'Nussmuse', 'Nussmuse mit kurzer Zutatenliste und guter Nährwertbasis.', 'Nussmuse werden nach Protein, Zucker, Salz und der Kürze ihrer Zutatenliste verglichen.', '["proteinreich", "gute-zutaten"]'::jsonb),
  ('fertiggerichte', 'Fertiggerichte', 'Schnelle Mahlzeiten mit transparenter Nährwert- und Zutatenbewertung.', 'Fertiggerichte werden besonders bei Salz, gesättigten Fettsäuren, Protein und Zutaten differenziert.', '["beste-wahl", "familie"]'::jsonb),
  ('erfrischungsgetraenke', 'Erfrischungsgetränke', 'Getränke mit weniger Zucker und nachvollziehbaren Zutaten.', 'Erfrischungsgetränke werden primär nach Zucker und Zutaten bewertet; Süßstoffe bleiben sichtbar.', '["wenig-zucker", "gute-zutaten"]'::jsonb),
  ('kinder-snacks', 'Kinder-Snacks', 'Snacks für Familien mit konservativer Zucker-, Salz- und Zutatenbewertung.', 'Kinder-Snacks werden bewusst streng nach Zucker, Salz, Zutaten und bekannten Allergenen eingeordnet.', '["familie", "wenig-zucker"]'::jsonb)
on conflict (slug) do update set
  label = excluded.label,
  intent = excluded.intent,
  description = excluded.description,
  ranking_attributes = excluded.ranking_attributes;

insert into ranking_pages (attribute, category_slug, title, intro, sort_score, indexable, min_products_required)
values
  ('wenig-zucker', 'hafermilch', 'Beste Hafermilch mit wenig Zucker', 'Hafermilch nach Zucker-Score, Zutaten und Datenqualität.', 'low_sugar', false, 20),
  ('beste-wahl', 'hafermilch', 'Beste Hafermilch im Gesamtvergleich', 'Hafermilch nach transparentem Gesamturteil.', 'overall_match', false, 20),
  ('proteinreich', 'proteinriegel', 'Proteinreichste Proteinriegel', 'Proteinriegel nach kategoriespezifischem Protein-Score.', 'protein', false, 20),
  ('wenig-zucker', 'proteinriegel', 'Proteinriegel mit wenig Zucker', 'Proteinriegel nach Zucker-Score und Datenqualität.', 'low_sugar', false, 20),
  ('wenig-zucker', 'muesli', 'Müslis mit wenig Zucker', 'Müsli nach Zucker-Score und Zutatenqualität.', 'low_sugar', false, 20),
  ('beste-wahl', 'muesli', 'Beste Müslis nach Gesamturteil', 'Müsli nach transparentem Gesamturteil.', 'overall_match', false, 20),
  ('proteinreich', 'joghurt-skyr', 'Proteinreichste Joghurts und Skyr', 'Joghurt und Skyr nach Protein-Score.', 'protein', false, 20),
  ('wenig-zucker', 'joghurt-skyr', 'Joghurt und Skyr mit wenig Zucker', 'Joghurt und Skyr nach Zucker-Score.', 'low_sugar', false, 20),
  ('vegan', 'vegane-snacks', 'Beste vegane Snacks', 'Vegane Snacks nach Kennzeichnung, Zutaten und Datenqualität.', 'vegan', false, 20),
  ('beste-wahl', 'vegane-snacks', 'Vegane Snacks im Gesamtvergleich', 'Vegane Snacks nach transparentem Gesamturteil.', 'overall_match', false, 20),
  ('wenig-zucker', 'fruehstueckscerealien', 'Frühstückscerealien mit wenig Zucker', 'Cerealien nach Zucker-Score.', 'low_sugar', false, 20),
  ('familie', 'fruehstueckscerealien', 'Familientaugliche Frühstückscerealien', 'Cerealien nach konservativem Familien-Score.', 'family', false, 20),
  ('wenig-zucker', 'pflanzliche-joghurts', 'Pflanzliche Joghurts mit wenig Zucker', 'Pflanzliche Joghurts nach Zucker-Score.', 'low_sugar', false, 20),
  ('beste-wahl', 'pflanzliche-joghurts', 'Beste pflanzliche Joghurts', 'Pflanzliche Joghurts nach Gesamturteil.', 'overall_match', false, 20),
  ('gute-zutaten', 'brotaufstriche', 'Brotaufstriche mit den besten Zutaten', 'Aufstriche nach Zutaten-Score.', 'ingredient_quality', false, 20),
  ('beste-wahl', 'brotaufstriche', 'Beste Brotaufstriche im Vergleich', 'Aufstriche nach Gesamturteil.', 'overall_match', false, 20),
  ('proteinreich', 'nussmuse', 'Proteinreiche Nussmuse', 'Nussmuse nach Protein-Score.', 'protein', false, 20),
  ('gute-zutaten', 'nussmuse', 'Nussmuse mit kurzer Zutatenliste', 'Nussmuse nach Zutaten-Score.', 'ingredient_quality', false, 20),
  ('beste-wahl', 'fertiggerichte', 'Beste Fertiggerichte im Gesamtvergleich', 'Fertiggerichte nach Gesamturteil.', 'overall_match', false, 20),
  ('familie', 'fertiggerichte', 'Familientaugliche Fertiggerichte', 'Fertiggerichte nach Familien-Score.', 'family', false, 20),
  ('wenig-zucker', 'erfrischungsgetraenke', 'Erfrischungsgetränke mit wenig Zucker', 'Getränke nach Zucker-Score.', 'low_sugar', false, 20),
  ('gute-zutaten', 'erfrischungsgetraenke', 'Getränke mit nachvollziehbaren Zutaten', 'Getränke nach Zutaten-Score.', 'ingredient_quality', false, 20),
  ('familie', 'kinder-snacks', 'Beste Kinder-Snacks für Familien', 'Kinder-Snacks nach Familien-Score.', 'family', false, 20),
  ('wenig-zucker', 'kinder-snacks', 'Kinder-Snacks mit wenig Zucker', 'Kinder-Snacks nach Zucker-Score.', 'low_sugar', false, 20)
on conflict (attribute, category_slug) do update set
  title = excluded.title,
  intro = excluded.intro,
  sort_score = excluded.sort_score,
  min_products_required = excluded.min_products_required;
