export const ZAMBIAN_REGIONS = {
  "Central": ["Chibombo", "Chisamba", "Chitambo", "Itezhi-Tezhi", "Kabwe", "Kapiri Mposhi", "Luano", "Mkushi", "Mumbwa", "Ngabwe", "Serenje", "Shibuyunji"],
  "Copperbelt": ["Chililabombwe", "Chingola", "Kalulushi", "Kitwe", "Luanshya", "Lufwanyama", "Masaiti", "Mpongwe", "Mufulira", "Ndola"],
  "Eastern": ["Chadiza", "Chama", "Chasefu", "Chipata", "Chipangali", "Katete", "Lundazi", "Mambwe", "Nyimba", "Petauke", "Sinda", "Vubwi"],
  "Luapula": ["Chembe", "Chienge", "Chifunabuli", "Chipili", "Kawambwa", "Lunga", "Mansa", "Milenge", "Mwansabombwe", "Mwense", "Nchelenge", "Samfya"],
  "Lusaka": ["Chilanga", "Chirundu", "Chongwe", "Kafue", "Luangwa", "Lusaka", "Rufunsa", "Shibuyunji"],
  "Muchinga": ["Chama", "Chinsali", "Isoka", "Kanchibiya", "Lavushimanda", "Mafinga", "Mpika", "Nakonde", "Shiwang'andu"],
  "Northern": ["Chilubi", "Kaputa", "Kasama", "Lunte", "Lupososhi", "Luwingu", "Mbala", "Mporokoso", "Mpulungu", "Mungwi", "Nsama", "Senga Hill"],
  "North-Western": ["Chavuma", "Ikelenge", "Kabompo", "Kalumbila", "Kasempa", "Manyinga", "Mufumbwe", "Mushindamo", "Mwinilunga", "Solwezi", "Zambezi"],
  "Southern": ["Chikankata", "Choma", "Gwembe", "Kalomo", "Kazungula", "Livingstone", "Mazabuka", "Monze", "Namwala", "Pemba", "Siavonga", "Sinazongwe", "Zimba"],
  "Western": ["Kalabo", "Kaoma", "Limulunga", "Luampa", "Lukulu", "Mitete", "Mongu", "Mulobezi", "Mwandi", "Nalolo", "Nkeyema", "Senanga", "Sesheke", "Shang'ombo", "Sikongo", "Sioma"]
} as const;

export type Province = keyof typeof ZAMBIAN_REGIONS;
