-- Cascading administrative options for African chapter geography.
-- Level definitions gain depends_on; options store fixed selectable values (with free-text still allowed in the admin UI).

alter table public.community_countries
  add column if not exists administrative_options jsonb not null default '{}'::jsonb;

alter table public.community_countries
  drop constraint if exists community_countries_administrative_options_object;

alter table public.community_countries
  add constraint community_countries_administrative_options_object
  check (jsonb_typeof(administrative_options) = 'object');

-- Refresh level configs with depends_on for cascading selects.
update public.community_countries
set administrative_level_config = case code
  when 'NG' then '[
    {"key":"state","label":"State","order":1},
    {"key":"local_government","label":"Local Government Area","short_label":"LGA","order":2,"depends_on":"state"}
  ]'::jsonb
  when 'GH' then '[
    {"key":"region","label":"Region","order":1},
    {"key":"district","label":"District","order":2,"depends_on":"region"}
  ]'::jsonb
  when 'KE' then '[
    {"key":"county","label":"County","order":1},
    {"key":"sub_county","label":"Sub-county","order":2,"depends_on":"county"}
  ]'::jsonb
  when 'ZA' then '[
    {"key":"province","label":"Province","order":1},
    {"key":"district","label":"District Municipality","order":2,"depends_on":"province"},
    {"key":"local_municipality","label":"Local Municipality","order":3,"depends_on":"district"}
  ]'::jsonb
  when 'EG' then '[
    {"key":"governorate","label":"Governorate","order":1},
    {"key":"district","label":"District","order":2,"depends_on":"governorate"}
  ]'::jsonb
  else administrative_level_config
end
where code in ('NG', 'GH', 'KE', 'ZA', 'EG');

update public.community_countries
set administrative_options = '{
  "state": [
    "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta",
    "Ebonyi","Edo","Ekiti","Enugu","FCT - Abuja","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina",
    "Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers",
    "Sokoto","Taraba","Yobe","Zamfara"
  ],
  "local_government": {
    "Lagos": [
      "Agege","Ajeromi-Ifelodun","Alimosho","Amuwo-Odofin","Apapa","Badagry","Epe","Eti-Osa","Ibeju-Lekki",
      "Ifako-Ijaiye","Ikeja","Ikorodu","Kosofe","Lagos Island","Lagos Mainland","Mushin","Ojo","Oshodi-Isolo",
      "Shomolu","Surulere"
    ],
    "FCT - Abuja": ["Abaji","Bwari","Gwagwalada","Kuje","Kwali","Municipal Area Council"],
    "Oyo": ["Afijio","Akinyele","Atiba","Atisbo","Egbeda","Ibadan North","Ibadan North-East","Ibadan North-West","Ibadan South-East","Ibadan South-West","Ibarapa Central","Ibarapa East","Ibarapa North","Ido","Irepo","Iseyin","Itesiwaju","Iwajowa","Kajola","Lagelu","Ogbomosho North","Ogbomosho South","Ogo Oluwa","Olorunsogo","Oluyole","Ona Ara","Orelope","Ori Ire","Oyo East","Oyo West","Saki East","Saki West","Surulere"],
    "Rivers": ["Abua-Odual","Ahoada East","Ahoada West","Akuku-Toru","Andoni","Asari-Toru","Bonny","Degema","Eleme","Emohua","Etche","Gokana","Ikwerre","Khana","Obio-Akpor","Ogba-Egbema-Ndoni","Ogu-Bolo","Okrika","Omuma","Opobo-Nkoro","Oyigbo","Port Harcourt","Tai"],
    "Ogun": ["Abeokuta North","Abeokuta South","Ado-Odo/Ota","Ewekoro","Ifo","Ijebu East","Ijebu North","Ijebu North East","Ijebu Ode","Ikenne","Imeko Afon","Ipokia","Obafemi Owode","Odeda","Odogbolu","Ogun Waterside","Remo North","Shagamu","Yewa North","Yewa South"],
    "Kano": ["Ajingi","Albasu","Bagwai","Bebeji","Bichi","Bunkure","Dala","Dambatta","Dawakin Kudu","Dawakin Tofa","Doguwa","Fagge","Gabasawa","Garko","Garun Mallam","Gaya","Gezawa","Gwale","Gwarzo","Kabo","Kano Municipal","Karaye","Kibiya","Kiru","Kumbotso","Kunchi","Kura","Madobi","Makoda","Minjibir","Nasarawa","Rano","Rimin Gado","Rogo","Shanono","Sumaila","Takai","Tarauni","Tofa","Tsanyawa","Tudun Wada","Ungogo","Warawa","Wudil"],
    "Enugu": ["Aninri","Awgu","Enugu East","Enugu North","Enugu South","Ezeagu","Igbo Etiti","Igbo Eze North","Igbo Eze South","Isi Uzo","Nkanu East","Nkanu West","Nsukka","Oji River","Udenu","Udi","Uzo Uwani"]
  }
}'::jsonb
where code = 'NG';

update public.community_countries
set administrative_options = '{
  "region": [
    "Ahafo","Ashanti","Bono","Bono East","Central","Eastern","Greater Accra","North East","Northern",
    "Oti","Savannah","Upper East","Upper West","Volta","Western","Western North"
  ],
  "district": {
    "Greater Accra": [
      "Accra Metropolitan","Ablekuma Central","Ablekuma North","Ablekuma West","Ayawaso Central","Ayawaso East",
      "Ayawaso North","Ayawaso West","Ga Central","Ga East","Ga North","Ga South","Ga West","Korle Klottey",
      "Krowor","La Dade Kotopon","La Nkwantanang Madina","Ledzokuku","Okaikwei North","Okaikwei South",
      "Shai Osudoku","Tema Metropolitan","Tema West","Weija Gbawe"
    ],
    "Ashanti": ["Kumasi Metropolitan","Asokwa","Oforikrom","Suame","Kwadaso","Old Tafo","Asante Akim Central","Bekwai Municipal","Ejisu Municipal","Obuasi Municipal"],
    "Central": ["Cape Coast Metropolitan","Komenda Edina Eguafo Abirem","Mfantseman","Awutu Senya East","Effutu"],
    "Eastern": ["New Juaben South","New Juaben North","Akuapem North","Akuapem South","Lower Manya Krobo","Upper Manya Krobo"],
    "Western": ["Sekondi Takoradi Metropolitan","Effia Kwesimintsim","Ahanta West","Nzema East","Ellembelle"],
    "Northern": ["Tamale Metropolitan","Sagnarigu","Savelugu","Yendi Municipal","Tolon"]
  }
}'::jsonb
where code = 'GH';

update public.community_countries
set administrative_options = '{
  "county": [
    "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa","Homa Bay","Isiolo","Kajiado",
    "Kakamega","Kericho","Kiambu","Kilifi","Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu",
    "Machakos","Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang''a","Nairobi","Nakuru",
    "Nandi","Narok","Nyamira","Nyandarua","Nyeri","Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi",
    "Trans Nzoia","Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot"
  ],
  "sub_county": {
    "Nairobi": [
      "Dagoretti North","Dagoretti South","Embakasi Central","Embakasi East","Embakasi North","Embakasi South",
      "Embakasi West","Kamukunji","Kasarani","Kibra","Langata","Makadara","Mathare","Roysambu","Ruaraka",
      "Starehe","Westlands"
    ],
    "Mombasa": ["Changamwe","Jomvu","Kisauni","Likoni","Mvita","Nyali"],
    "Kiambu": ["Gatundu North","Gatundu South","Githunguri","Juja","Kabete","Kiambaa","Kiambu","Kikuyu","Lari","Limuru","Ruiru","Thika Town"],
    "Nakuru": ["Bahati","Gilgil","Kuresoi North","Kuresoi South","Molo","Naivasha","Nakuru Town East","Nakuru Town West","Njoro","Rongai","Subukia"],
    "Kisumu": ["Kisumu Central","Kisumu East","Kisumu West","Muhoroni","Nyakach","Nyando","Seme"]
  }
}'::jsonb
where code = 'KE';

update public.community_countries
set administrative_options = '{
  "province": [
    "Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga",
    "North West","Northern Cape","Western Cape"
  ],
  "district": {
    "Gauteng": ["City of Johannesburg","City of Tshwane","Ekurhuleni","Sedibeng","West Rand"],
    "Western Cape": ["City of Cape Town","Cape Winelands","Central Karoo","Garden Route","Overberg","West Coast"],
    "KwaZulu-Natal": ["eThekwini","Amajuba","Harry Gwala","iLembe","King Cetshwayo","Ugu","uMgungundlovu","uMkhanyakude","uThukela","Zululand"],
    "Eastern Cape": ["Buffalo City","Nelson Mandela Bay","Alfred Nzo","Amathole","Chris Hani","Joe Gqabi","OR Tambo","Sarah Baartman"],
    "Free State": ["Mangaung","Fezile Dabi","Lejweleputswa","Thabo Mofutsanyana","Xhariep"]
  },
  "local_municipality": {
    "City of Johannesburg": ["Johannesburg"],
    "City of Tshwane": ["Tshwane"],
    "Ekurhuleni": ["Ekurhuleni"],
    "City of Cape Town": ["Cape Town"],
    "eThekwini": ["eThekwini"]
  }
}'::jsonb
where code = 'ZA';

update public.community_countries
set administrative_options = '{
  "governorate": [
    "Alexandria","Aswan","Asyut","Beheira","Beni Suef","Cairo","Dakahlia","Damietta","Faiyum","Gharbia",
    "Giza","Ismailia","Kafr El Sheikh","Luxor","Matrouh","Minya","Monufia","New Valley","North Sinai",
    "Port Said","Qalyubia","Qena","Red Sea","Sharqia","Sohag","South Sinai","Suez"
  ],
  "district": {
    "Cairo": ["Nasr City","Heliopolis","Maadi","Zamalek","Shubra","Helwan","Old Cairo","New Cairo"],
    "Giza": ["Dokki","Agouza","Mohandessin","6th of October","Sheikh Zayed","Imbaba"],
    "Alexandria": ["Montaza","East","Central","Amreya","Gomrok","Labban"],
    "Sharqia": ["Zagazig","10th of Ramadan","Bilbeis","Faqous"],
    "Qalyubia": ["Banha","Shubra El Kheima","Qalyub","Khanka"]
  }
}'::jsonb
where code = 'EG';

comment on column public.community_countries.administrative_options is
  'Fixed cascading option lists keyed by administrative level. Child levels map parent value → option arrays.';
