let plat = (p, t) =>  ({ platform: p, type: t })
let conc = (t, q) =>  ({ concourse: true, type: t, query: q })
let platr = (c, e, t) => Array(c).fill(0).map((_, p) => plat(p + 1, t)).filter(p => !e.includes(p.platform))

module.exports = {
  "Dingee": [],
  "Pyramid": [],
  "Rockbank": [],
  "Melton": [],
  "Ballan": [],
  "Ballarat": [...platr(2, [], 'vline-half-platform')],
  "Ararat": [],
  "Castlemaine": [],
  "Maryborough": [],
  "Talbot": [],
  "Bendigo": [...platr(2, [], 'vline-half-platform')],
  "Kangaroo Flat": [],
  "Malmsbury": [],
  "Kyneton": [],
  "Woodend": [],
  "Macedon": [],
  "Riddells Creek": [],
  "Clarkefield": [...platr(2, [], 'vline-half-platform')],
  "Gisborne": [],
  "Sunbury": [...platr(2, [], 'half-platform'), conc('up-down')],
  "Diggers Rest": [...platr(2, [], 'half-platform-bold')],
  "Craigieburn": [...platr(2, [], 'half-platform-bold')],
  "Roxburgh Park": [...platr(2, [], 'half-platform-bold')],
  "Upfield": [...platr(1, [], 'half-platform-bold')],
  "Coolaroo": [...platr(2, [], 'half-platform-bold')],
  "Watergardens": [...platr(3, [], 'half-platform-bold'), conc('up-down')],
  "Keilor Plains": [...platr(2, [], 'half-platform-bold')],
  "Gowrie": [...platr(2, [], 'half-platform-bold')],
  "Broadmeadows": [...platr(2, [], 'half-platform-bold')],
  "Jacana": [],
  "Glenroy": [],
  "Oak Park": [],
  "Fawkner": [],
  "Pascoe Vale": [],
  "Strathmore": [],
  "Glenbervie": [],
  "Essendon": [...platr(3, [], 'half-platform-bold')],
  "Brunswick": [],
  "Jewell": [],
  "Royal Park": [],
  "Moonee Ponds": [],
  "Ascot Vale": [],
  "Flemington Racecourse": [],
  "Newmarket": [...platr(2, [], 'half-platform-bold')],
  "Kensington": [],
  "South Kensington": [],
  "Flemington Bridge": [],
  "Macaulay": [],
  "North Melbourne": [...platr(6, [], 'platform'), ...platr(6, [], 'pre-platform-vertical'), conc('interchange')],
  "Flagstaff": [...platr(4, [], 'platform'), conc('interchange')],
  "Southern Cross": [...platr(8, [], 'sss-platform')],
  "Footscray": [...platr(2, [], 'half-platform'), plat(3, 'vline-half-platform'), plat(4, 'vline-half-platform'), plat(5, 'half-platform'), plat(6, 'half-platform'), conc('up-down'), conc('interchange')],
  "Tottenham": [...platr(2, [], 'half-platform-bold')],
  "Middle Footscray": [],
  "West Footscray": [plat(1, 'platform'), plat(2, 'half-platform-bold'), conc('up-down')],
  "Seddon": [...platr(2, [], 'half-platform')],
  "Yarraville": [...platr(2, [], 'half-platform')],
  "St. Albans": [...platr(2, [], 'half-platform'), conc('up-down')],
  "Ginifer": [...platr(2, [], 'half-platform'), conc('up-down')],
  "Albion": [...platr(2, [], 'half-platform-bold')],
  "Sunshine": [...platr(2, [], 'half-platform'), plat(3, 'vline-half-platform'), plat(4, 'vline-half-platform'), conc('up-down')], // 3, 4 vline style
  "Shepparton": [],
  "Murchison East": [],
  "Wodonga": [],
  "Bairnsdale": [],
  "Seymour": [],
  "Wandong": [],
  "Heathcote Junction": [],
  "Lilydale": [],
  "South Morang": [...platr(2, [], 'half-platform-bold')],
  "Epping": [...platr(2, [], 'half-platform-bold')],
  "Darebin": [],
  "Box Hill": [...platr(4, [1], 'platform'), conc('up-down')],
  "Mont Albert": [...platr(3, [], 'half-platform-bold')],
  "Surrey Hills": [...platr(3, [], 'half-platform-bold')],
  "Chatham": [...platr(2, [], 'half-platform-bold')],
  "Canterbury": [...platr(2, [], 'half-platform'), plat(3, 'pre-platform-vertical')],
  "Auburn": [...platr(3, [], 'half-platform-bold')],
  "Moreland": [],
  "Northcote": [],
  "Merri": [],
  "Anstey": [],
  "Bell": [],
  "Thornbury": [],
  "Alphington": [],
  "Croxton": [],
  "Fairfield": [...platr(2, [], 'half-platform-bold')],
  "Dennis": [...platr(2, [], 'half-platform')],
  "Westgarth": [...platr(2, [], 'half-platform')],
  "Rushall": [],
  "Clifton Hill": [...platr(2, [], 'half-platform-bold')],
  "Victoria Park": [],
  "Glenferrie": [...platr(3, [], 'half-platform-bold')],
  "Hawthorn": [],
  "Collingwood": [],
  "North Richmond": [],
  "West Richmond": [],
  "Flinders Street": [...platr(14, [11], 'fss-platform'), ...platr(14, [11], 'fss-escalator'), plat(null, 'trains-from-fss')],
  "Parliament": [...platr(4, [], 'platform'), conc('interchange')],
  "Jolimont": [...platr(2, [], 'half-platform-bold')],
  "Richmond": [...platr(10, [], 'platform'), conc('interchange')],
  "Melbourne Central": [...platr(4, [], 'platform')],
  "South Yarra": [...platr(6, [], 'half-platform-bold'), conc('up-down', 'd=up'), conc('up-down', 'd=down')],
  "Prahran": [],
  "Burnley": [...platr(4, [], 'half-platform-bold')],
  "East Richmond": [],
  "Heyington": [],
  "Kooyong": [],
  "Tooronga": [],
  "Toorak": [...platr(4, [], 'half-platform-bold')],
  "Hawksburn": [...platr(4, [], 'half-platform-bold')],
  "Lalor": [...platr(2, [], 'half-platform-bold')],
  "Hurstbridge": [plat(1, 'half-platform-bold')],
  "Wattle Glen": [],
  "Diamond Creek": [],
  "Eltham": [],
  "Mooroolbark": [],
  "Croydon": [...platr(2, [], 'half-platform-bold')],
  "Ringwood": [...platr(3, [], 'half-platform-bold')],
  "Ringwood East": [...platr(2, [], 'half-platform-bold')],
  "Heatherdale": [...platr(2, [], 'half-platform')],
  "Mitcham": [...platr(2, [], 'half-platform')],
  "Nunawading": [...platr(2, [], 'half-platform-bold')],
  "Blackburn": [...platr(3, [], 'half-platform-bold')],
  "Laburnum": [],
  "Thomastown": [...platr(2, [], 'half-platform-bold')],
  "Keon Park": [],
  "Ruthven": [],
  "Reservoir": [...platr(2, [], 'half-platform-bold'), conc('up-down')],
  "Regent": [],
  "Preston": [],
  "Merlynston": [],
  "Batman": [],
  "Coburg": [],
  "Greensborough": [...platr(2, [], 'half-platform-bold')],
  "Montmorency": [],
  "Watsonia": [],
  "Macleod": [],
  "Heidelberg": [...platr(2, [], 'half-platform')],
  "Ivanhoe": [],
  "Eaglemont": [],
  "Windsor": [...platr(2, [], 'half-platform-bold')],
  "Balaclava": [],
  "Armadale": [...platr(4, [], 'half-platform-bold'), conc('up-down')],
  "Malvern": [...platr(4, [], 'half-platform-bold'), conc('up-down')],
  "Caulfield": [...platr(4, [], 'half-platform-bold'), conc('up-down')],
  "Glenhuntly": [],
  "Ripponlea": [...platr(2, [], 'half-platform-bold')],
  "Elsternwick": [],
  "Camberwell": [...platr(3, [], 'half-platform-bold')],
  "East Camberwell": [],
  "Riversdale": [],
  "Willison": [],
  "Burwood": [],
  "Hartwell": [],
  "Gardiner": [],
  "Jordanville": [...platr(2, [], 'half-platform-bold')],
  "Mount Waverley": [...platr(2, [], 'half-platform-bold')],
  "Holmesglen": [],
  "Glen Iris": [...platr(2, [], 'half-platform')],
  "Darling": [],
  "Ashburton": [],
  "Alamein": [],
  "East Malvern": [],
  "Murrumbeena": [...platr(2, [], 'half-platform'), conc('up-down')],
  "Carnegie": [...platr(2, [], 'half-platform'), conc('up-down')],
  "Yarraman": [...platr(2, [], 'half-platform-bold')],
  "Dandenong": [...platr(3, [], 'half-platform'), conc('up-down')],
  "Narre Warren": [],
  "Hallam": [],
  "Lynbrook": [...platr(2, [], 'half-platform-bold')],
  "Merinda Park": [...platr(1, [], 'half-platform-bold')],
  "Cranbourne": [...platr(2, [], 'half-platform-bold')],
  "Carrum": [...platr(2, [], 'platform'), conc('up-down')],
  "Seaford": [],
  "Kananook": [...platr(2, [], 'half-platform-bold')],
  "Mentone": [...platr(2, [], 'platform')],
  "Parkdale": [...platr(2, [], 'half-platform-bold')],
  "Mordialloc": [...platr(2, [], 'half-platform-bold')],
  "Aspendale": [],
  "Edithvale": [],
  "Chelsea": [],
  "Bonbeach": [],
  "Tecoma": [],
  "Belgrave": [],
  "Tynong": [],
  "Garfield": [...platr(2, [], 'vline-half-platform')],
  "Nar Nar Goon": [...platr(2, [], 'vline-half-platform')],
  "Beaconsfield": [],
  "Berwick": [...platr(2, [], 'half-platform-bold')],
  "Cardinia Road": [...platr(2, [], 'half-platform-bold')],
  "Pakenham": [],
  "Officer": [],
  "Frankston": [... platr(3, [], 'platform'), conc('up-down')],
  "Leawarra": [],
  "Baxter": [],
  "Somerville": [],
  "Tyabb": [],
  "Hastings": [],
  "Bittern": [],
  "Stony Point": [],
  "Morradoo": [],
  "Crib Point": [],
  "Drouin": [],
  "Longwarry": [],
  "Bunyip": [],
  "Trafalgar": [],
  "Moe": [],
  "Warragul": [],
  "Yarragon": [],
  "Stratford": [],
  "Sale": [],
  "Traralgon": [plat(1, 'vline-half-platform')],
  "Rosedale": [],
  "Spotswood": [],
  "Newport": [...platr(2, [], 'half-platform')],
  "Williamstown": [],
  "North Williamstown": [...platr(2, [], 'half-platform')],
  "Williamstown Beach": [],
  "North Geelong": [],
  "Geelong": [...platr(3, [], 'vline-half-platform')],
  "South Geelong": [],
  "Warrnambool": [],
  "Ormond": [...platr(3, [], 'half-platform')],
  "Oakleigh": [...platr(2, [], 'half-platform-bold'), ...platr(2, [], 'platform'), conc('up-down')],
  "McKinnon": [...platr(3, [], 'half-platform')],
  "Bentleigh": [...platr(3, [], 'half-platform')],
  "Patterson": [],
  "Huntingdale": [],
  "Clayton": [...platr(2, [], 'half-platform'), conc('up-down')],
  "Westall": [...platr(3, [], 'half-platform-bold'), conc('up-down')],
  "Moorabbin": [...platr(2, [], 'half-platform-bold')],
  "Highett": [],
  "Southland": [...platr(2, [], 'half-platform-bold')],
  "Cheltenham": [...platr(3, [], 'platform'), conc('up-down')],
  "Brighton Beach": [],
  "Gardenvale": [],
  "North Brighton": [],
  "Middle Brighton": [],
  "Hampton": [...platr(2, [], 'half-platform-bold')],
  "Sandringham": [],
  "Glen Waverley": [...platr(2, [], 'half-platform-bold')],
  "Syndal": [...platr(2, [], 'half-platform-bold')],
  "Heathmont": [],
  "Bayswater": [...platr(2, [], 'half-platform')],
  "Boronia": [...platr(2, [], 'half-platform-bold')],
  "Ferntree Gully": [...platr(2, [], 'half-platform-bold')],
  "Upper Ferntree Gully": [...platr(2, [], 'half-platform-bold')],
  "Upwey": [],
  "Springvale": [...platr(2, [], 'half-platform-bold')],
  "Sandown Park": [],
  "Noble Park": [...platr(2, [], 'half-platform')],
  "Little River": [...platr(2, [], 'vline-half-platform')],
  "Lara": [...platr(2, [], 'vline-half-platform')],
  "Corio": [],
  "North Shore": [],
  "Aircraft": [],
  "Williams Landing": [...platr(2, [], 'half-platform'), conc('up-down')],
  "Hoppers Crossing": [],
  "Werribee": [...platr(3, [], 'half-platform-bold'), conc('up-down')],
  "Westona": [...platr(2, [], 'half-platform')],
  "Seaholme": [],
  "Altona": [...platr(2, [], 'half-platform')],
  "Laverton": [...platr(3, [], 'half-platform-bold'), conc('up-down')],
  "Ardeer": [...platr(2, [], 'vline-half-platform')],
  "Deer Park": [...platr(2, [], 'vline-half-platform')],
  "Tarneit": [...platr(2, [], 'vline-half-platform')],
  "Wyndham Vale": [...platr(2, [], 'vline-half-platform')],
  "Bacchus Marsh": [],
  "Cobblebank": [],
  "Caroline Springs": [...platr(2, [], 'vline-half-platform')],
  "Donnybrook": [...platr(2, [], 'vline-half-platform')],
  "Wallan": [],
  "Kilmore East": [],
  "Broadford": [],
  "Tallarook": [],
  "Avenel": [],
  "Euroa": [],
  "Violet Town": [],
  "Springhurst": [],
  "Chiltern": [],
  "Benalla": [],
  "Albury": [],
  "Hughesdale": [...platr(2, [], 'half-platform'), conc('up-down')],
  "Rosanna": [...platr(2, [], 'half-platform')],
  "Middle Gorge": [...platr(2, [], 'half-platform'), conc('up-down')],
  "Hawkstowe": [...platr(2, [], 'half-platform'), conc('up-down')],
  "Mernda": [...platr(2, [], 'half-platform'), conc('up-down')],
  "Wendouree": [],
  "Marshall": [],
  "Waurn Ponds": [],
  "Winchelsea": [],
  "Birregurra": [],
  "Colac": [...platr(1, [], 'vline-half-platform')],
  "Camperdown": [],
  "Terang": [],
  "Sherwood Park": [],
  "Warnambool": [],
  "Beaufort": [],
  "Creswick": [],
  "Clunes": [],
  "Eaglehawk": [],
  "Kerang": [],
  "Swan Hill": [],
  "Epsom": [],
  "Elmore": [],
  "Rochester": [],
  "Echuca": [],
  "Nagambie": [],
  "Mooroopna": [],
  "Wangaratta": [],
  "Morwell": []
}
