update categories
set label = 'Cracker und Knäckebrot',
    intent = 'Cracker und Knäckebrot mit weniger Zucker, Salz und verständlichen Zutaten.',
    description = 'Cracker und Knäckebrot werden nach Zucker, Protein, Salz, gesättigten Fettsäuren und Zutatenqualität verglichen.'
where slug = 'cracker';

update ranking_pages
set title = case attribute
      when 'wenig-zucker' then 'Cracker und Knäckebrot mit wenig Zucker'
      when 'gute-zutaten' then 'Cracker und Knäckebrot mit verständlichen Zutaten'
      else title
    end,
    intro = case attribute
      when 'wenig-zucker' then 'Cracker und Knäckebrot nach Zuckerwert.'
      when 'gute-zutaten' then 'Cracker und Knäckebrot nach Zutatenqualität.'
      else intro
    end
where category_slug = 'cracker'
  and market = 'DE';

update ranking_pages
set title = case attribute
      when 'wenig-zucker' then 'Crackers and crispbread with less sugar'
      when 'gute-zutaten' then 'Crackers and crispbread with understandable ingredients'
      else title
    end,
    intro = case attribute
      when 'wenig-zucker' then 'Crackers and crispbread ranked by sugar content.'
      when 'gute-zutaten' then 'Crackers and crispbread ranked by ingredient quality.'
      else intro
    end
where category_slug = 'cracker'
  and market = 'US';
