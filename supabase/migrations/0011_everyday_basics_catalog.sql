insert into categories (slug, label, intent, description, ranking_attributes)
values
  ('brot', 'Brot', 'Brote mit guter Nährwertbasis und verständlichen Zutaten.', 'Brot wird nach Zucker, Protein, Salz, gesättigten Fettsäuren und Zutatenqualität verglichen.', '["beste-wahl", "gute-zutaten"]'::jsonb),
  ('pasta', 'Pasta', 'Pasta mit guter Nährwertbasis für alltägliche Gerichte.', 'Pasta wird nach Protein, Zucker, Salz, gesättigten Fettsäuren und Zutatenqualität verglichen.', '["proteinreich", "gute-zutaten"]'::jsonb),
  ('pastasaucen', 'Pastasaucen', 'Pastasaucen mit weniger Zucker, Salz und unnötigen Zusätzen.', 'Pastasaucen werden nach Zucker, Salz, gesättigten Fettsäuren, Protein und Zutatenqualität verglichen.', '["wenig-zucker", "gute-zutaten"]'::jsonb),
  ('suppen', 'Suppen', 'Suppen mit ausgewogener Nährwertbasis und klaren Zutaten.', 'Suppen werden nach Zucker, Protein, Salz, gesättigten Fettsäuren und Zutatenqualität verglichen.', '["beste-wahl", "familie"]'::jsonb),
  ('tiefkuehlgerichte', 'Tiefkühlgerichte', 'Schnelle Tiefkühlgerichte mit transparenten Stärken und Schwächen.', 'Tiefkühlgerichte werden nach Zucker, Protein, Salz, gesättigten Fettsäuren und Zutatenqualität verglichen.', '["beste-wahl", "familie"]'::jsonb),
  ('cracker', 'Cracker', 'Cracker mit weniger Zucker, Salz und verständlichen Zutaten.', 'Cracker werden nach Zucker, Protein, Salz, gesättigten Fettsäuren und Zutatenqualität verglichen.', '["wenig-zucker", "gute-zutaten"]'::jsonb)
on conflict (slug) do update set
  label = excluded.label,
  intent = excluded.intent,
  description = excluded.description,
  ranking_attributes = excluded.ranking_attributes;

update categories
set label = 'Kinder Snacks',
    intent = 'Snacks für Familien mit konservativer Bewertung von Zucker, Salz und Zutaten.'
where slug = 'kinder-snacks';

insert into ranking_pages (
  attribute, category_slug, title, intro, sort_score,
  indexable, min_products_required, market, locale
)
select ranking.attribute, ranking.category_slug, ranking.title, ranking.intro,
  ranking.sort_score, false, 20, ranking.market, ranking.locale
from (values
  ('beste-wahl', 'brot', 'Bestes Brot im Gesamtvergleich', 'Brot nach transparentem Gesamturteil.', 'overall_match', 'DE', 'de-DE'),
  ('gute-zutaten', 'brot', 'Brot mit verständlichen Zutaten', 'Brot nach Zutatenqualität.', 'ingredient_quality', 'DE', 'de-DE'),
  ('proteinreich', 'pasta', 'Proteinreiche Pasta', 'Pasta nach Proteinwert.', 'protein', 'DE', 'de-DE'),
  ('gute-zutaten', 'pasta', 'Pasta mit verständlichen Zutaten', 'Pasta nach Zutatenqualität.', 'ingredient_quality', 'DE', 'de-DE'),
  ('wenig-zucker', 'pastasaucen', 'Pastasaucen mit wenig Zucker', 'Pastasaucen nach Zuckerwert.', 'low_sugar', 'DE', 'de-DE'),
  ('gute-zutaten', 'pastasaucen', 'Pastasaucen mit verständlichen Zutaten', 'Pastasaucen nach Zutatenqualität.', 'ingredient_quality', 'DE', 'de-DE'),
  ('beste-wahl', 'suppen', 'Beste Suppen im Gesamtvergleich', 'Suppen nach transparentem Gesamturteil.', 'overall_match', 'DE', 'de-DE'),
  ('familie', 'suppen', 'Geeignete Suppen für Familien', 'Suppen nach konservativer Familienbewertung.', 'family', 'DE', 'de-DE'),
  ('beste-wahl', 'tiefkuehlgerichte', 'Beste Tiefkühlgerichte im Gesamtvergleich', 'Tiefkühlgerichte nach transparentem Gesamturteil.', 'overall_match', 'DE', 'de-DE'),
  ('familie', 'tiefkuehlgerichte', 'Geeignete Tiefkühlgerichte für Familien', 'Tiefkühlgerichte nach konservativer Familienbewertung.', 'family', 'DE', 'de-DE'),
  ('wenig-zucker', 'cracker', 'Cracker mit wenig Zucker', 'Cracker nach Zuckerwert.', 'low_sugar', 'DE', 'de-DE'),
  ('gute-zutaten', 'cracker', 'Cracker mit verständlichen Zutaten', 'Cracker nach Zutatenqualität.', 'ingredient_quality', 'DE', 'de-DE'),
  ('beste-wahl', 'brot', 'Best bread overall', 'Bread ranked by the transparent overall score.', 'overall_match', 'US', 'en-US'),
  ('gute-zutaten', 'brot', 'Bread with understandable ingredients', 'Bread ranked by ingredient quality.', 'ingredient_quality', 'US', 'en-US'),
  ('proteinreich', 'pasta', 'Pasta ranked by protein content', 'Pasta ranked by protein content.', 'protein', 'US', 'en-US'),
  ('gute-zutaten', 'pasta', 'Pasta with understandable ingredients', 'Pasta ranked by ingredient quality.', 'ingredient_quality', 'US', 'en-US'),
  ('wenig-zucker', 'pastasaucen', 'Pasta sauces with less sugar', 'Pasta sauces ranked by sugar content.', 'low_sugar', 'US', 'en-US'),
  ('gute-zutaten', 'pastasaucen', 'Pasta sauces with understandable ingredients', 'Pasta sauces ranked by ingredient quality.', 'ingredient_quality', 'US', 'en-US'),
  ('beste-wahl', 'suppen', 'Best soups overall', 'Soups ranked by the transparent overall score.', 'overall_match', 'US', 'en-US'),
  ('familie', 'suppen', 'Soups suitable for families', 'Soups ranked by the conservative family score.', 'family', 'US', 'en-US'),
  ('beste-wahl', 'tiefkuehlgerichte', 'Best frozen meals overall', 'Frozen meals ranked by the transparent overall score.', 'overall_match', 'US', 'en-US'),
  ('familie', 'tiefkuehlgerichte', 'Frozen meals suitable for families', 'Frozen meals ranked by the conservative family score.', 'family', 'US', 'en-US'),
  ('wenig-zucker', 'cracker', 'Crackers with less sugar', 'Crackers ranked by sugar content.', 'low_sugar', 'US', 'en-US'),
  ('gute-zutaten', 'cracker', 'Crackers with understandable ingredients', 'Crackers ranked by ingredient quality.', 'ingredient_quality', 'US', 'en-US')
) as ranking(attribute, category_slug, title, intro, sort_score, market, locale)
on conflict (attribute, category_slug, market) do update set
  title = excluded.title,
  intro = excluded.intro,
  sort_score = excluded.sort_score,
  min_products_required = excluded.min_products_required,
  locale = excluded.locale;
