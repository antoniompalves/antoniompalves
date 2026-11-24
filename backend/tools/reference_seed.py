"""Curated list of common ingredients in Portuguese home cooking.

Each entry ties a Portuguese ingredient to:
  - usda:   SR Legacy food description (nutrition per 100 g + measured portion weights)
  - match:  regex over Continente product names (accent-free, lowercase) for price estimates
  - avoid:  regex of product names to exclude (flavoured, ready meals, kids' products...)
  - aisle:  supermarket section, used to sort shopping lists
  - unit_g: grams for one "unidade"/piece when USDA has no good portion (edible part)
  - basis:  "kg" (default) or "un" when shops price it per unit (eggs, avocado, garlic head...)

Run tools/build_reference.py to turn this into app/data/ingredients_pt.json.
"""

FRUTAS = "Frutas e legumes"
TALHO = "Talho"
PEIXE = "Peixaria"
LATI = "Laticínios e ovos"
CHARC = "Charcutaria e queijos"
PADARIA = "Padaria"
MERC = "Mercearia"
TEMP = "Temperos e especiarias"
CONG = "Congelados"

SEED = [
    # ---------------- legumes, fruta, aromáticas
    dict(key="alho", aliases=["dente de alho", "dentes de alho", "alho picado", "garlic"], aisle=FRUTAS, usda="Garlic, raw", match=r"(dentes de )?alho\b", avoid=r"pao|molho|maionese|\bpo\b|frances|negro|congel|frito|biolog|flocos|desidrat|granulad|frasco|moido|picado", unit_g=5),
    dict(key="cebola", aliases=["cebolas", "onion", "cebola branca", "cebola amarela"], aisle=FRUTAS, usda="Onions, raw", match=r"^cebola\b", avoid=r"roxa|frita|congelad|caramel|crocante|pickles|nova|chalota|picada", unit_g=150),
    dict(key="cebola roxa", aliases=["red onion"], aisle=FRUTAS, usda="Onions, raw", match=r"cebola roxa", avoid=r"pickle|conserva", unit_g=150),
    dict(key="chalota", aliases=["chalotas", "echalote", "shallot"], aisle=FRUTAS, usda="Shallots, raw", match=r"chalota|echalote|cebola chalota", avoid=r"flocos|desidrat|frasco", unit_g=40),
    dict(key="alho-francês", aliases=["alho frances", "alho porro", "leek"], aisle=FRUTAS, usda="Leeks, (bulb and lower leaf-portion), raw", match=r"alho frances", avoid=r"congel", unit_g=200),
    dict(key="batata", aliases=["batatas", "potato", "batata branca", "batata vermelha"], aisle=FRUTAS, usda="Potatoes, flesh and skin, raw", match=r"^batata\b", avoid=r"doce|frita|palha|chips|pure|congel|camponesa|lascas|sticks|ondulad|aneis|rodelas|baby|palito|airfryer|cortad|gratinad", unit_g=170),
    dict(key="batata-doce", aliases=["batata doce", "sweet potato", "batatas-doces"], aisle=FRUTAS, usda="Sweet potato, raw, unprepared (Includes foods for USDA's Food Distribution Program)", match=r"batata doce", avoid=r"frita|chips|congel|pure", unit_g=200),
    dict(key="cenoura", aliases=["cenouras", "carrot"], aisle=FRUTAS, usda="Carrots, raw", match=r"^cenoura", avoid=r"ralada|baby|congel|sumo|palito", unit_g=70),
    dict(key="tomate", aliases=["tomates", "tomato", "tomate maduro", "tomate chucha"], aisle=FRUTAS, usda="Tomatoes, red, ripe, raw, year round average", match=r"^tomate\b", avoid=r"cherry|cereja|pelado|polpa|concentrado|seco|ketchup|molho|passata|triturado|sumo|rama", unit_g=125),
    dict(key="tomate-cereja", aliases=["tomate cereja", "tomates cereja", "cherry tomatoes", "tomate cherry"], aisle=FRUTAS, usda="Tomatoes, red, ripe, raw, year round average", match=r"tomate (cherry|cereja)", unit_g=15),
    dict(key="pimento", aliases=["pimentos", "pimento vermelho", "pimento verde", "pimento amarelo", "bell pepper"], aisle=FRUTAS, usda="Peppers, sweet, red, raw", match=r"^pimento", avoid=r"padron|assado|conserva|piquillo|po|doce em po|recheado", unit_g=150),
    dict(key="malagueta", aliases=["malaguetas", "piri-piri", "piripiri", "chili", "pimenta caiena fresca", "jalapeño"], aisle=FRUTAS, usda="Peppers, hot chili, red, raw", match=r"malagueta", avoid=r"molho|oleo|azeite|\bpo\b|seca|amendoim", unit_g=5),
    dict(key="pepino", aliases=["pepinos", "cucumber"], aisle=FRUTAS, usda="Cucumber, with peel, raw", match=r"^pepino", avoid=r"conserva|pickle|agridoce", unit_g=300),
    dict(key="curgete", aliases=["curgetes", "courgette", "zucchini", "abobrinha"], aisle=FRUTAS, usda="Squash, summer, zucchini, includes skin, raw", match=r"curgete", avoid=r"espiral|esparguete|congel", unit_g=200),
    dict(key="beringela", aliases=["beringelas", "eggplant", "aubergine"], aisle=FRUTAS, usda="Eggplant, raw", match=r"beringela", avoid=r"grelhad|conserva", unit_g=300),
    dict(key="abóbora", aliases=["abobora", "pumpkin", "abóbora-manteiga", "butternut"], aisle=FRUTAS, usda="Pumpkin, raw", match=r"abobora", avoid=r"sementes|doce|sopa|creme|pure|congel", unit_g=1000),
    dict(key="alface", aliases=["alfaces", "lettuce", "alface iceberg", "alface romana"], aisle=FRUTAS, usda="Lettuce, cos or romaine, raw", match=r"^alface", avoid=r"mistura|salada|4 estacoes", unit_g=300),
    dict(key="rúcula", aliases=["rucula", "rocket", "arugula"], aisle=FRUTAS, usda="Arugula, raw", match=r"rucula", unit_g=None),
    dict(key="espinafres", aliases=["espinafre", "spinach", "espinafres baby"], aisle=FRUTAS, usda="Spinach, raw", match=r"espinafre", avoid=r"congel|esparregado|creme|empad", unit_g=None),
    dict(key="brócolos", aliases=["brocolos", "brócolo", "broccoli"], aisle=FRUTAS, usda="Broccoli, raw", match=r"brocolo", avoid=r"congel|creme|sopa", unit_g=400),
    dict(key="couve-flor", aliases=["couve flor", "cauliflower"], aisle=FRUTAS, usda="Cauliflower, raw", match=r"couve flor", avoid=r"congel|arroz|gratinad", unit_g=600),
    dict(key="couve", aliases=["couve portuguesa", "couve galega", "couve lombarda", "couve coração", "cabbage", "couve-portuguesa"], aisle=FRUTAS, usda="Cabbage, raw", match=r"^couve\b(?! flor)", avoid=r"roxa|bruxelas|kale|congel|lombarda cortad", unit_g=800),
    dict(key="couve roxa", aliases=["red cabbage"], aisle=FRUTAS, usda="Cabbage, red, raw", match=r"couve roxa", unit_g=800),
    dict(key="feijão-verde", aliases=["feijao verde", "green beans", "vagens"], aisle=FRUTAS, usda="Beans, snap, green, raw", match=r"feijao verde", avoid=r"congel|conserva", unit_g=None),
    dict(key="cogumelos", aliases=["cogumelo", "cogumelos frescos", "cogumelos brancos", "champignon", "mushrooms", "cogumelos marron"], aisle=FRUTAS, usda="Mushrooms, white, raw", match=r"cogumelos? (branco|marron|frescos|laminad|paris|champignon)|cogumelos?$|cogumelos? continente", avoid=r"conserva|laminado congel|seco|shiitake|pleurotus|molho", unit_g=20),
    dict(key="espargos", aliases=["espargo", "asparagus"], aisle=FRUTAS, usda="Asparagus, raw", match=r"espargo", avoid=r"conserva|frasco|congel", unit_g=None),
    dict(key="beterraba", aliases=["beterrabas", "beetroot"], aisle=FRUTAS, usda="Beets, raw", match=r"beterraba", avoid=r"conserva|sumo", unit_g=150),
    dict(key="nabo", aliases=["nabos", "turnip"], aisle=FRUTAS, usda="Turnips, raw", match=r"^nabo", avoid=r"grelos|rama", unit_g=120),
    dict(key="grelos", aliases=["grelos de nabo", "nabiças", "rapini"], aisle=FRUTAS, usda="Broccoli raab, raw", match=r"grelos|nabica", avoid=r"congel", unit_g=None),
    dict(key="aipo", aliases=["salsão", "celery"], aisle=FRUTAS, usda="Celery, raw", match=r"^aipo", unit_g=40),
    dict(key="milho doce", aliases=["milho", "corn", "maçaroca"], aisle=MERC, usda="Corn, sweet, yellow, canned, whole kernel, drained solids", match=r"milho doce", avoid=r"pipocas|tortilla|farinha|flocos", unit_g=None),
    dict(key="abacate", aliases=["abacates", "avocado"], aisle=FRUTAS, usda="Avocados, raw, all commercial varieties", match=r"^abacate", avoid=r"guacamole|creme|oleo", unit_g=150, basis="un"),
    dict(key="limão", aliases=["limao", "limões", "lemon", "sumo de limão", "raspa de limão"], aisle=FRUTAS, usda="Lemons, raw, without peel", match=r"^limao", avoid=r"sumo concentrado|bebida|refresco|tarte|gelado", unit_g=100),
    dict(key="lima", aliases=["limas", "lime", "sumo de lima"], aisle=FRUTAS, usda="Limes, raw", match=r"^lima\b", avoid=r"bebida|refresco", unit_g=65),
    dict(key="laranja", aliases=["laranjas", "orange", "sumo de laranja", "raspa de laranja"], aisle=FRUTAS, usda="Oranges, raw, all commercial varieties", match=r"^laranja", avoid=r"bebida|sumo|refresco|nectar|compota", unit_g=180),
    dict(key="maçã", aliases=["maca", "maçãs", "apple"], aisle=FRUTAS, usda="Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)", match=r"^maca\b", avoid=r"sumo|compota|desidrat|chips|pure|bebida", unit_g=180),
    dict(key="pera", aliases=["peras", "pear"], aisle=FRUTAS, usda="Pears, raw", match=r"^pera\b", avoid=r"sumo|nectar|calda|bebida", unit_g=170),
    dict(key="banana", aliases=["bananas"], aisle=FRUTAS, usda="Bananas, raw", match=r"banana (continente|da madeira|das canarias|biolog)", avoid=r"chips|desidrat|bolo|bebida|sumo", unit_g=120),
    dict(key="morangos", aliases=["morango", "strawberries"], aisle=FRUTAS, usda="Strawberries, raw", match=r"^morango", avoid=r"compota|iogurte|congel|gelado|bebida|leite", unit_g=12),
    dict(key="framboesas", aliases=["framboesa", "raspberries"], aisle=FRUTAS, usda="Raspberries, raw", match=r"framboesa", avoid=r"compota|iogurte|bebida", unit_g=None),
    dict(key="mirtilos", aliases=["mirtilo", "blueberries"], aisle=FRUTAS, usda="Blueberries, raw", match=r"mirtilo", avoid=r"compota|iogurte|bebida|desidrat", unit_g=None),
    dict(key="manga", aliases=["mangas", "mango"], aisle=FRUTAS, usda="Mangos, raw", match=r"^manga\b", avoid=r"sumo|nectar|desidrat|bebida|chutney", unit_g=300),
    dict(key="ananás", aliases=["ananas", "abacaxi", "pineapple"], aisle=FRUTAS, usda="Pineapple, raw, all varieties", match=r"^ananas|^abacaxi", avoid=r"sumo|calda|conserva|bebida", unit_g=1000),
    dict(key="coentros", aliases=["coentro", "cilantro", "coriander"], aisle=FRUTAS, usda="Coriander (cilantro) leaves, raw", match=r"coentro", avoid=r"po|semente|seco|moido", unit_g=None),
    dict(key="salsa", aliases=["salsa fresca", "parsley"], aisle=FRUTAS, usda="Parsley, fresh", match=r"^salsa\b", avoid=r"seca|desidrat", unit_g=None),
    dict(key="manjericão", aliases=["manjericao", "basil", "folhas de manjericão"], aisle=FRUTAS, usda="Basil, fresh", match=r"manjericao", avoid=r"seco|pesto|vaso|tremoco", unit_g=None),
    dict(key="hortelã", aliases=["hortela", "mint"], aisle=FRUTAS, usda="Spearmint, fresh", match=r"hortela", avoid=r"cha|infus|rebucad|pastilh", unit_g=None),
    dict(key="cebolinho", aliases=["cebolinha", "chives", "cebola verde", "spring onion", "scallions"], aisle=FRUTAS, usda="Onions, spring or scallions (includes tops and bulb), raw", match=r"cebolinho", avoid=r"desidrat|seco|frasco|flocos", unit_g=15),
    dict(key="gengibre", aliases=["gengibre fresco", "ginger"], aisle=FRUTAS, usda="Ginger root, raw", match=r"gengibre", avoid=r"\bpo\b|desidrat|moido|bebida|cha|infus|rebucad|cristaliz|shot", unit_g=None),

    # ---------------- talho
    dict(key="peito de frango", aliases=["frango", "peitos de frango", "chicken breast", "bifes de frango"], aisle=TALHO, usda="Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw", match=r"peito.*frango|bife.*frango|frango.*peito", avoid=r"panad|nugget|fiambre|fumad|cozid|assad|temperad|recheado|espetad|hamburg|forno|lenha|fatias|fat\b|primor|izidoro|campofrio|elpozo|bonnatur|argal", unit_g=None),
    dict(key="coxas de frango", aliases=["coxa de frango", "pernas de frango", "chicken thighs", "sobrecoxas"], aisle=TALHO, usda="Chicken, broilers or fryers, dark meat, thigh, meat only, raw", match=r"(coxa|perna).*frango|frango.*(coxa|perna)", avoid=r"panad|assad|temperad|cozid", unit_g=None),
    dict(key="frango inteiro", aliases=["frango do campo"], aisle=TALHO, usda="Chicken, broilers or fryers, meat and skin, raw", match=r"^frango\b", avoid=r"panad|nugget|asa|coxa|perna|peito|bife|tiras|cubos|assad|temperad|hamburg|salsicha|espetad|almondeg|fiambre|piri", unit_g=None),
    dict(key="carne picada de vaca", aliases=["carne picada", "carne moída", "ground beef", "carne picada de novilho"], aisle=TALHO, usda="Beef, ground, 80% lean meat / 20% fat, raw", match=r"carne picada|picado de (novilho|vaca|bovino)", avoid=r"porco|peru|frango|mista|vegetal|almondeg|hamburg", unit_g=None),
    dict(key="carne de vaca para estufar", aliases=["vaca", "novilho", "carne de vaca", "carne para estufar", "acém", "beef stew meat"], aisle=TALHO, usda="Beef, chuck, arm pot roast, separable lean and fat, trimmed to 1/8\" fat, all grades, raw", match=r"(novilho|vitela|vitelao|bovino).*(estufar|cozer|acem|cubos|pa\b)|(estufar|cubos).*(novilho|vitela|vitelao)", avoid=r"panad|hamburg|picad", unit_g=None),
    dict(key="bife de vaca", aliases=["bifes de vaca", "bife", "entrecosto de vaca", "lombo de vaca", "steak", "vazia"], aisle=TALHO, usda="Beef, top sirloin, steak, separable lean and fat, trimmed to 1/8\" fat, choice, raw", match=r"(bife|vazia|lombo|entrecote).*(novilho|vitela|vitelao|vaca)|(novilho|vitela|vitelao).*(bife|vazia|lombo|entrecote)", avoid=r"panad|hamburg|picad|peru|frango|porco", unit_g=None),
    dict(key="lombo de porco", aliases=["porco", "carne de porco", "bifes de porco", "febras", "pork loin"], aisle=TALHO, usda="Pork, fresh, loin, whole, separable lean and fat, raw", match=r"(lombo|febra|bife|cachaco|perna).*porco|porco.*(lombo|febra|bife)", avoid=r"panad|fumad|fiambre|presunto|enchid|salsich|picad|temperad|bacon|entremeada", unit_g=None),
    dict(key="entremeada", aliases=["toucinho", "barriga de porco", "pork belly"], aisle=TALHO, usda="Pork, fresh, belly, raw", match=r"entremeada|barriga.*porco|toucinho", avoid=r"fumad|bacon", unit_g=None),
    dict(key="costeletas de porco", aliases=["costeleta de porco", "pork chops", "entrecosto"], aisle=TALHO, usda="Pork, fresh, loin, center rib (chops or roasts), bone-in, separable lean and fat, raw", match=r"(costeleta|entrecosto).*porco|porco.*(costeleta|entrecosto)", avoid=r"temperad|fumad", unit_g=None),
    dict(key="carne picada de porco", aliases=["picado de porco"], aisle=TALHO, usda="Pork, fresh, ground, raw", match=r"picad.*porco|porco.*picad", avoid=r"almondeg|hamburg", unit_g=None),
    dict(key="peru", aliases=["peito de peru", "bifes de peru", "turkey"], aisle=TALHO, usda="Turkey, whole, breast, meat only, raw", match=r"(bifes?|peito|lombo|perna|coxa|costeleta).*(de|do) peru", avoid=r"fiambre|fumad|panad|salsich|hamburg|assad|cozid|picad", unit_g=None),
    dict(key="borrego", aliases=["cordeiro", "lamb"], aisle=TALHO, usda="Lamb, leg, sirloin half, separable lean and fat, trimmed to 1/4\" fat, choice, raw", match=r"borrego|cordeiro", unit_g=None),

    # ---------------- peixaria
    dict(key="salmão", aliases=["salmao", "lombo de salmão", "posta de salmão", "salmon"], aisle=PEIXE, usda="Fish, salmon, Atlantic, farmed, raw", match=r"salmao", avoid=r"fumad|sushi|panad|patê|pate|lata|conserva|hamburg|tartar", unit_g=None),
    dict(key="bacalhau", aliases=["bacalhau demolhado", "lombos de bacalhau", "cod"], aisle=PEIXE, usda="Fish, cod, Atlantic, raw", match=r"bacalhau", avoid=r"pataniscas|bolinhos|pasteis|brás|bras|desfiado seco|com natas|espiritual|lascas secas|sal\b|seco", unit_g=None),
    dict(key="pescada", aliases=["filetes de pescada", "hake", "postas de pescada"], aisle=PEIXE, usda="Fish, cod, Atlantic, raw", match=r"pescada", avoid=r"panad|filete panad|ovas", unit_g=None),
    dict(key="camarão", aliases=["camarao", "camarões", "gambas", "shrimp", "prawns", "camarão descascado"], aisle=PEIXE, usda="Crustaceans, shrimp, raw", match=r"camarao|gamba|miolo de camarao", avoid=r"panad|rissol|surimi|molho|chips|aperitivo|arroz|tamboril|caldeirada", unit_g=None),
    dict(key="atum em lata", aliases=["atum", "atum ao natural", "atum em azeite", "canned tuna", "lata de atum"], aisle=MERC, usda="Fish, tuna, light, canned in oil, drained solids", match=r"^atum\b.*(natural|azeite|oleo|posta|lata)|atum (posta|natural|em azeite|em oleo)", avoid=r"pate|patê|salada|fresco|lombo", unit_g=None),
    dict(key="sardinhas", aliases=["sardinha", "sardines"], aisle=PEIXE, usda="Fish, sardine, Atlantic, canned in oil, drained solids with bone", match=r"sardinha", avoid=r"pate|patê", unit_g=None),
    dict(key="lulas", aliases=["lula", "squid", "argolas de lula"], aisle=PEIXE, usda="Mollusks, squid, mixed species, raw", match=r"lulas?|argolas de lula", avoid=r"panad|frit|romana|caldeirada", unit_g=None),
    dict(key="polvo", aliases=["octopus"], aisle=PEIXE, usda="Mollusks, octopus, common, raw", match=r"polvo", avoid=r"salada|cozid", unit_g=None),
    dict(key="mexilhão", aliases=["mexilhao", "mexilhões", "mussels"], aisle=PEIXE, usda="Mollusks, mussel, blue, raw", match=r"mexilha", avoid=r"escabeche|conserva", unit_g=None),
    dict(key="dourada", aliases=["sea bream"], aisle=PEIXE, usda="Fish, sea bass, mixed species, raw", match=r"dourada (fresca|inteira|de aquacultura|continente)|dourada$|dourada \d", avoid=r"sultana|passa", unit_g=None),
    dict(key="robalo", aliases=["sea bass"], aisle=PEIXE, usda="Fish, sea bass, mixed species, raw", match=r"robalo", unit_g=None),

    # ---------------- laticínios e ovos
    dict(key="ovos", aliases=["ovo", "eggs", "egg", "ovos M", "ovos L", "ovo inteiro", "ovos inteiros"], aisle=LATI, usda="Egg, whole, raw, fresh", match=r"ovos?\b.*(classe|duzia|solo|ar livre|campo)", avoid=r"pascoa|chocolate|codorniz|liquid|cozid|pasteuriz|claras|gemas", unit_g=55, basis="un"),
    dict(key="gemas de ovo", aliases=["gema", "gemas", "gema de ovo", "egg yolks"], aisle=LATI, usda="Egg, yolk, raw, fresh", match=r"ovos?\b.*(classe|duzia|solo|ar livre|campo)", avoid=r"pascoa|chocolate|codorniz|liquid|cozid|pasteuriz", unit_g=17, basis="un"),
    dict(key="claras de ovo", aliases=["clara", "claras", "egg whites"], aisle=LATI, usda="Egg, white, raw, fresh", match=r"ovos?\b.*(classe|duzia|solo|ar livre|campo)", avoid=r"pascoa|chocolate|codorniz|liquid|cozid|pasteuriz", unit_g=33, basis="un"),
    dict(key="leite", aliases=["leite meio-gordo", "leite gordo", "leite magro", "milk"], aisle=LATI, usda="Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D", match=r"^leite\b.*(uht|meio gordo|gordo|magro|fresco)", avoid=r"achocolat|chocolate|morango|condensad|po|coco|soja|aveia|amendoa|arroz|bebida|sem lactose|infantil|crescimento", unit_g=None),
    dict(key="natas", aliases=["natas para culinária", "nata", "cream", "heavy cream", "natas para bater", "double cream"], aisle=LATI, usda="Cream, fluid, heavy whipping", match=r"^natas?\b", avoid=r"soja|vegetal|aveia|coco|spray", unit_g=None),
    dict(key="manteiga", aliases=["butter", "manteiga sem sal", "manteiga com sal"], aisle=LATI, usda="Butter, without salt", match=r"^manteiga\b", avoid=r"amendoim|cacau|alho|ervas|vegetal|ghee|bolachas", unit_g=None),
    dict(key="iogurte natural", aliases=["iogurte", "iogurte grego", "yogurt", "greek yogurt"], aisle=LATI, usda="Yogurt, plain, whole milk", match=r"^iogurte.*(natural|grego)", avoid=r"aromat|morango|frutos|bebivel|liquido|aveia|soja|coco", unit_g=None),
    dict(key="queijo mozzarella", aliases=["mozzarella", "mozarela", "queijo mozarela"], aisle=CHARC, usda="Cheese, mozzarella, whole milk", match=r"queijo mozzarella|mozzarella|queijo mozarela", avoid=r"pizza|panad|palitos|focaccia", unit_g=None),
    dict(key="queijo parmesão", aliases=["parmesão", "parmesao", "parmigiano", "grana padano", "parmesan", "queijo parmesão ralado"], aisle=CHARC, usda="Cheese, parmesan, grated", match=r"(queijo )?(parmes|grana padano|parmigiano)", unit_g=None),
    dict(key="queijo pecorino", aliases=["pecorino", "pecorino romano"], aisle=CHARC, usda="Cheese, romano", match=r"(queijo )?pecorino", unit_g=None),
    dict(key="queijo flamengo", aliases=["queijo", "queijo fatiado", "queijo ralado", "cheddar", "queijo amanteigado"], aisle=CHARC, usda="Cheese, gouda", match=r"queijo (flamengo|ralado|fatias|cheddar|bola|gouda|edam)", avoid=r"fresco|creme|barrar|light|vegano", unit_g=None),
    dict(key="queijo fresco", aliases=["requeijão", "requeijao", "ricotta", "cottage"], aisle=LATI, usda="Cheese, ricotta, whole milk", match=r"queijo fresco|requeijao|ricotta", avoid=r"barrar|azeitona", unit_g=None),
    dict(key="queijo-creme", aliases=["queijo creme", "cream cheese", "philadelphia", "queijo para barrar"], aisle=LATI, usda="Cheese, cream", match=r"queijo creme|queijo para barrar|philadelphia", avoid=r"ervas|alho|salmao", unit_g=None),
    dict(key="queijo feta", aliases=["feta"], aisle=CHARC, usda="Cheese, feta", match=r"(queijo )?feta\b", unit_g=None),
    dict(key="leite de coco", aliases=["coconut milk"], aisle=MERC, usda="Nuts, coconut milk, canned (liquid expressed from grated meat and water)", match=r"leite de coco", avoid=r"bebida|uht", unit_g=None),

    # ---------------- charcutaria
    dict(key="bacon", aliases=["bacon fumado", "bacon em cubos", "toucinho fumado", "pancetta"], aisle=CHARC, usda="Pork, cured, bacon, unprepared", match=r"\bbacon\b", avoid=r"batata|snack|molho|aroma|bits", unit_g=None),
    dict(key="guanciale", aliases=["papada de porco"], aisle=CHARC, usda="Pork, cured, bacon, unprepared", match=r"guanciale|\bbacon\b", avoid=r"batata|snack|molho|aroma|bits", unit_g=None),
    dict(key="chouriço", aliases=["chourico", "chouriço de carne", "chorizo"], aisle=CHARC, usda="Sausage, pork, chorizo, link or ground, raw", match=r"chourico", avoid=r"pao|mel\b|sangue|doce|torresmo", unit_g=None),
    dict(key="presunto", aliases=["prosciutto", "presunto fatiado", "jamón"], aisle=CHARC, usda="Pork, cured, ham, whole, separable lean and fat, unheated", match=r"presunto|jamon|prosciutto", avoid=r"cubos|tosta|snack", unit_g=None),
    dict(key="fiambre", aliases=["ham", "fiambre de porco", "fiambre da perna"], aisle=CHARC, usda="Ham, sliced, regular (approximately 11% fat)", match=r"^fiambre", avoid=r"peru|frango", unit_g=None),
    dict(key="salsichas", aliases=["salsicha", "sausages", "salsichas frescas"], aisle=CHARC, usda="Sausage, Italian, pork, mild, raw", match=r"salsicha", avoid=r"vegetal|frango|peru|lata|cocktail", unit_g=None),

    # ---------------- padaria
    dict(key="pão", aliases=["pao", "pão de forma", "pão ralado", "bread", "carcaça", "baguete"], aisle=PADARIA, usda="Bread, white, commercially prepared (includes soft bread crumbs)", match=r"^pao\b", avoid=r"ralado|torrad|leite|centeio|integral|sem gluten|hamburg|hot dog|pita|tortilha|naan|brioche|deus|ló|lo\b|alho", unit_g=50),
    dict(key="pão ralado", aliases=["pao ralado", "breadcrumbs", "panko"], aisle=MERC, usda="Bread, crumbs, dry, grated, plain", match=r"pao ralado|panko", unit_g=None),
    dict(key="tortilhas", aliases=["wraps", "tortilha de trigo", "tortillas"], aisle=PADARIA, usda="Tortillas, ready-to-bake or -fry, flour, refrigerated", match=r"tortilh|wrap", avoid=r"chips|milho frito", unit_g=40),

    # ---------------- mercearia
    dict(key="farinha", aliases=["farinha de trigo", "farinha sem fermento", "farinha T55", "flour", "all-purpose flour", "farinha T65"], aisle=MERC, usda="Wheat flour, white, all-purpose, enriched, bleached", match=r"^farinha\b.*(trigo|sem fermento|t55|t65|branca|tipo 55|tipo 65)|^farinha (sem fermento|t55|t65)", avoid=r"integral|espelta|milho|arroz|centeio|aveia|amendoa|coco|grao|alfarroba|sem gluten|pizza|pao|maizena|com fermento", unit_g=None),
    dict(key="farinha com fermento", aliases=["self-raising flour"], aisle=MERC, usda="Wheat flour, white, all-purpose, self-rising, enriched", match=r"farinha.*com fermento", avoid=r"integral|espelta", unit_g=None),
    dict(key="amido de milho", aliases=["maizena", "maisena", "cornstarch", "farinha maizena"], aisle=MERC, usda="Cornstarch", match=r"(farinha )?(maizena|amido de milho)", avoid=r"bio\b", unit_g=None),
    dict(key="açúcar", aliases=["acucar", "açúcar branco", "sugar", "açúcar granulado"], aisle=MERC, usda="Sugars, granulated", match=r"^acucar\b", avoid=r"mascavado|amarelo|baunilh|\bpo\b|cristal castanho|coco|stevia|light|edulcor|rapadura|confeiteiro|glace|cana integral|tamara|rapunzel|bio\b|saquetas|pacotes|sticks|\d+ ?un\b|moreno|panela|integral", unit_g=None),
    dict(key="açúcar amarelo", aliases=["açúcar mascavado", "brown sugar", "acucar amarelo"], aisle=MERC, usda="Sugars, brown", match=r"acucar (amarelo|mascavado)", unit_g=None),
    dict(key="açúcar em pó", aliases=["açúcar glacé", "powdered sugar", "icing sugar"], aisle=MERC, usda="Sugars, powdered", match=r"acucar (em po|glace)", unit_g=None),
    dict(key="mel", aliases=["honey"], aisle=MERC, usda="Honey", match=r"^mel\b", avoid=r"bolacha|cereais|caramelo|mostarda|cana", unit_g=None),
    dict(key="fermento em pó", aliases=["fermento", "baking powder", "fermento químico"], aisle=MERC, usda="Leavening agents, baking powder, double-acting, sodium aluminum sulfate", match=r"fermento (em po|quimico|royal|para bolos)", avoid=r"padeiro|fresco|biologico|farinha", unit_g=None),
    dict(key="fermento de padeiro", aliases=["levedura", "yeast", "fermento seco"], aisle=MERC, usda="Leavening agents, yeast, baker's, active dry", match=r"fermento (de padeiro|seco|fresco)|levedura", avoid=r"farinha", unit_g=None),
    dict(key="bicarbonato de sódio", aliases=["bicarbonato", "baking soda"], aisle=MERC, usda="Leavening agents, baking soda", match=r"bicarbonato", unit_g=None),
    dict(key="arroz", aliases=["arroz carolino", "arroz agulha", "rice", "arroz branco", "arroz do dia anterior"], aisle=MERC, usda="Rice, white, long-grain, regular, raw, enriched", match=r"^arroz\b.*(carolino|agulha|longo|vaporizado|extra longo)|^arroz (carolino|agulha)", avoid=r"basmati|integral|jasmin|risotto|arborio|vermelho|selvagem|tufado|bolacha|tortitas|bebida|doce|vaporizado em saqueta|pronto", unit_g=None),
    dict(key="arroz basmati", aliases=["basmati", "arroz jasmim", "arroz thai"], aisle=MERC, usda="Rice, white, long-grain, regular, raw, enriched", match=r"arroz (basmati|jasmin|thai)", avoid=r"pronto|micro", unit_g=None),
    dict(key="arroz arbóreo", aliases=["arroz para risotto", "arborio", "arroz carnaroli"], aisle=MERC, usda="Rice, white, medium-grain, raw, enriched", match=r"arroz.*(risotto|arborio|carnaroli)", unit_g=None),
    dict(key="massa", aliases=["massa seca", "pasta", "massa laços", "laços", "penne", "fusilli", "macarrão", "massa espiral", "cotovelos", "massa curta"], aisle=MERC, usda="Pasta, dry, enriched", match=r"^massa\b|penne|fusilli|macarrao|lacos|espirais|cotovelos|riscadinho|meadas", avoid=r"folhada|quebrada|pizza|tenra|filo|fresca|recheada|wonton|integral|lasanha|arroz|sem gluten|leguminosa|lentilha|grao|curgete|espirais de|legume", unit_g=None),
    dict(key="esparguete", aliases=["spaghetti", "esparguetes", "linguine", "tagliatelle", "esparguete seco"], aisle=MERC, usda="Pasta, dry, enriched", match=r"esparguete|spaghetti|linguine|tagliatelle", avoid=r"fresca|integral|curgete|arroz|sem gluten|lentilha|algas|bolonhesa", unit_g=None),
    dict(key="lasanha", aliases=["folhas de lasanha", "massa de lasanha"], aisle=MERC, usda="Pasta, dry, enriched", match=r"lasanha", avoid=r"congel|pronta|bolonhesa", unit_g=None),
    dict(key="massa de arroz", aliases=["noodles de arroz", "rice noodles", "massa chinesa", "noodles"], aisle=MERC, usda="Rice noodles, dry", match=r"(massa|noodles|aletria|esparguete|fitas) de arroz|vermicelli|massa chinesa", avoid=r"instant|copo|sabor|galinha|vaca|camarao|caril|koka|yakisoba|picante|carne|banzai|cigala|frango|vegetais", unit_g=None),
    dict(key="flocos de aveia", aliases=["aveia", "oats", "rolled oats"], aisle=MERC, usda="Cereals, oats, regular and quick, not fortified, dry", match=r"flocos de aveia|^aveia", avoid=r"bebida|bolacha|barra|granola", unit_g=None),
    dict(key="grão-de-bico", aliases=["grão", "grao de bico", "chickpeas", "grão cozido"], aisle=MERC, usda="Chickpeas (garbanzo beans, bengal gram), mature seeds, canned, drained solids", match=r"grao( de bico)?", avoid=r"farinha|massa|snack|hummus|tostado|frito", unit_g=None),
    dict(key="feijão", aliases=["feijão encarnado", "feijão branco", "feijão preto", "feijão manteiga", "beans", "kidney beans", "feijão cozido"], aisle=MERC, usda="Beans, kidney, red, mature seeds, canned, drained solids", match=r"^feijao\b(?! verde)", avoid=r"verde|frade seco|massa|snack|congel", unit_g=None),
    dict(key="lentilhas", aliases=["lentilha", "lentils", "lentilhas vermelhas"], aisle=MERC, usda="Lentils, raw", match=r"lentilhas?", avoid=r"massa|snack|cozid|quinoa", unit_g=None),
    dict(key="ervilhas", aliases=["ervilha", "peas", "ervilhas congeladas"], aisle=CONG, usda="Peas, green, frozen, unprepared (Includes foods for USDA's Food Distribution Program)", match=r"ervilhas?", avoid=r"tortas|snack|wasabi|com cenoura|linguica|proteina", unit_g=None),
    dict(key="tomate pelado", aliases=["tomate em lata", "tomates pelados", "canned tomatoes", "tomate triturado", "polpa de tomate", "passata", "tomate em pedaços"], aisle=MERC, usda="Tomatoes, red, ripe, canned, packed in tomato juice", match=r"tomate (pelado|triturado|em pedacos|cubos)|polpa de tomate|passata", avoid=r"temperad|com ervas|manjericao|picante", unit_g=None),
    dict(key="concentrado de tomate", aliases=["pasta de tomate", "tomato paste", "massa de tomate"], aisle=MERC, usda="Tomato products, canned, paste, without salt added (Includes foods for USDA's Food Distribution Program)", match=r"concentrado de tomate|pasta de tomate|massa de tomate", unit_g=None),
    dict(key="azeite", aliases=["azeite virgem extra", "olive oil", "fio de azeite", "extra virgin olive oil"], aisle=MERC, usda="Oil, olive, salad or cooking", match=r"^azeite\b", avoid=r"spray|aromatiz|alho|ervas|piri|limao|trufa|bagaco", unit_g=None),
    dict(key="óleo", aliases=["oleo", "óleo vegetal", "óleo de girassol", "vegetable oil", "sunflower oil", "óleo de amendoim"], aisle=MERC, usda="Oil, sunflower, linoleic (less than 60%)", match=r"^oleo\b.*(girassol|vegetal|alimentar|amendoim|milho|soja)", avoid=r"spray|coco|sesamo|motor|bebe|massagem", unit_g=None),
    dict(key="óleo de sésamo", aliases=["oleo de sesamo", "sesame oil"], aisle=MERC, usda="Oil, sesame, salad or cooking", match=r"oleo de sesamo", unit_g=None),
    dict(key="vinagre", aliases=["vinagre de vinho", "vinagre balsâmico", "vinegar", "vinagre de cidra"], aisle=MERC, usda="Vinegar, red wine", match=r"^vinagre", avoid=r"limpeza", unit_g=None),
    dict(key="vinho branco", aliases=["white wine", "vinho branco para cozinhar"], aisle=MERC, usda="Alcoholic beverage, wine, table, white", match=r"^vinho branco", avoid=r"espumante|verde|porto|licor", unit_g=None),
    dict(key="vinho tinto", aliases=["red wine"], aisle=MERC, usda="Alcoholic beverage, wine, table, red", match=r"^vinho tinto", avoid=r"porto|licor", unit_g=None),
    dict(key="caldo de legumes", aliases=["caldo", "cubo de caldo", "caldo de galinha", "caldo de carne", "stock cube", "broth", "caldo knorr"], aisle=MERC, usda="Soup, bouillon cubes and granules, low sodium, dry", match=r"caldo (de )?(legumes|galinha|carne|peixe|marisco)|caldo knorr", avoid=r"sopa|liquido 1l", unit_g=10),
    dict(key="molho de soja", aliases=["soja", "soy sauce", "molho soja", "shoyu", "tamari"], aisle=MERC, usda="Soy sauce made from soy and wheat (shoyu)", match=r"molho (de )?soja", unit_g=None),
    dict(key="molho teriyaki", aliases=["teriyaki"], aisle=MERC, usda="Sauce, teriyaki, ready-to-serve", match=r"teriyaki", unit_g=None),
    dict(key="maionese", aliases=["mayonnaise", "mayo"], aisle=MERC, usda="Salad dressing, mayonnaise, regular", match=r"maionese", avoid=r"light|vegan|alho|wasabi|lima", unit_g=None),
    dict(key="mostarda", aliases=["mustard", "mostarda dijon", "mostarda antiga"], aisle=MERC, usda="Mustard, prepared, yellow", match=r"^mostarda", avoid=r"mel\b", unit_g=None),
    dict(key="ketchup", aliases=["catchup"], aisle=MERC, usda="Catsup", match=r"ketchup", unit_g=None),
    dict(key="pesto", aliases=["pesto de manjericão", "molho pesto"], aisle=MERC, usda="Sauce, pesto, ready-to-serve, refrigerated", match=r"pesto", avoid=r"vermelho|rosso", unit_g=None),
    dict(key="chocolate de culinária", aliases=["chocolate", "chocolate negro", "chocolate para culinária", "dark chocolate", "pepitas de chocolate"], aisle=MERC, usda="Chocolate, dark, 70-85% cacao solids", match=r"chocolate (de )?(culinaria|negro|pastelaria|70|pepitas|fondant|para)", avoid=r"leite|branco|bombom|cereais|bolacha|gelado|bebida|barrar|soluvel", unit_g=None),
    dict(key="cacau em pó", aliases=["cacau", "cocoa powder"], aisle=MERC, usda="Cocoa, dry powder, unsweetened", match=r"cacau (magro )?em po|^cacau\b", avoid=r"bebida|soluvel|achocolat|bolacha|manteiga", unit_g=None),
    dict(key="amêndoa", aliases=["amendoas", "amêndoas", "almonds", "amêndoa laminada", "farinha de amêndoa"], aisle=FRUTAS, usda="Nuts, almonds", match=r"amendoas?", avoid=r"bebida|leite|chocolate|bolacha|torrada com sal", unit_g=None),
    dict(key="nozes", aliases=["noz", "walnuts", "miolo de noz"], aisle=FRUTAS, usda="Nuts, walnuts, english", match=r"noz(es)?\b|nozes", avoid=r"moscada|pecan|caju|coco|macadamia|bolacha|chocolate", unit_g=None),
    dict(key="amendoins", aliases=["amendoim", "peanuts", "manteiga de amendoim"], aisle=FRUTAS, usda="Peanuts, all types, raw", match=r"amendoi(m|ns)", avoid=r"chocolate|bolacha|snack|wasabi|mel", unit_g=None),
    dict(key="sementes de sésamo", aliases=["sésamo", "sesamo", "sesame seeds"], aisle=FRUTAS, usda="Seeds, sesame seeds, whole, dried", match=r"(sementes de )?sesamo", avoid=r"oleo|bolacha|barra", unit_g=None),
    dict(key="azeitonas", aliases=["azeitona", "olives", "azeitonas pretas", "azeitonas verdes"], aisle=FRUTAS, usda="Olives, ripe, canned (small-extra large)", match=r"azeitona", avoid=r"pate|patê|pasta|tapenade|recheada com", unit_g=4),
    dict(key="alcaparras", aliases=["alcaparra", "capers"], aisle=MERC, usda="Capers, canned", match=r"alcaparra", unit_g=None),
    dict(key="tofu", aliases=["tofu firme", "tofu fumado"], aisle=LATI, usda="Tofu, raw, firm, prepared with calcium sulfate", match=r"\btofu\b", avoid=r"sobremesa|bebida", unit_g=None),
    dict(key="água", aliases=["agua", "água a ferver", "água quente", "water", "água fria"], aisle=None, usda=None, match=None, unit_g=None, free=True),

    # ---------------- temperos e especiarias
    dict(key="sal", aliases=["sal fino", "sal grosso", "flor de sal", "salt", "sal marinho"], aisle=TEMP, usda="Salt, table", match=r"sal (fino|grosso|marinho|refinado|iodado|de mesa|continente)|flor de sal", avoid=r"ervas|alho|aromat|dietetic|bacalhau|amendo|tremoco", unit_g=None),
    dict(key="pimenta preta", aliases=["pimenta", "pimenta moída", "black pepper", "pimenta em grão"], aisle=TEMP, usda="Spices, pepper, black", match=r"pimenta preta|pimenta (moida|em grao|em po)", avoid=r"caiena|rosa|branca|jamaica|piri|doce|malagueta", unit_g=None),
    dict(key="colorau", aliases=["paprika", "pimentão doce", "pimentão-doce", "paprika fumada", "smoked paprika"], aisle=TEMP, usda="Spices, paprika", match=r"colorau|paprika|pimentao doce", unit_g=None),
    dict(key="cominhos", aliases=["cominho", "cumin"], aisle=TEMP, usda="Spices, cumin seed", match=r"cominho", unit_g=None),
    dict(key="canela", aliases=["canela em pó", "pau de canela", "cinnamon"], aisle=TEMP, usda="Spices, cinnamon, ground", match=r"canela (em po|moida|em pau|pau)|canela$|canela continente", avoid=r"bolacha|cereais|cha|infus|rebucad", unit_g=None),
    dict(key="noz-moscada", aliases=["noz moscada", "nutmeg"], aisle=TEMP, usda="Spices, nutmeg, ground", match=r"noz moscada", unit_g=None),
    dict(key="orégãos", aliases=["oregaos", "oregano", "orégãos secos"], aisle=TEMP, usda="Spices, oregano, dried", match=r"oregaos?|oregano", avoid=r"azeitona", unit_g=None),
    dict(key="louro", aliases=["folha de louro", "folhas de louro", "bay leaf"], aisle=TEMP, usda="Spices, bay leaf", match=r"louro (em folha|folha|folhas)|folhas? de louro|louro$|louro continente", avoid=r"azeitona", unit_g=0.2),
    dict(key="tomilho", aliases=["thyme"], aisle=TEMP, usda="Spices, thyme, dried", match=r"tomilho", unit_g=None),
    dict(key="alecrim", aliases=["rosemary"], aisle=TEMP, usda="Spices, rosemary, dried", match=r"alecrim", unit_g=None),
    dict(key="caril", aliases=["caril em pó", "curry", "pasta de caril", "curry powder"], aisle=TEMP, usda="Spices, curry powder", match=r"caril|curry", avoid=r"molho|pronto|frango|frutos secos|bites|compal|de grao|de legumes", unit_g=None),
    dict(key="açafrão-da-índia", aliases=["curcuma", "curcuma", "açafrão", "turmeric"], aisle=TEMP, usda="Spices, turmeric, ground", match=r"curcuma|acafrao", unit_g=None),
    dict(key="pimenta caiena", aliases=["caiena", "cayenne", "chili em pó", "malagueta seca", "flocos de malagueta"], aisle=TEMP, usda="Spices, pepper, red or cayenne", match=r"caiena|malagueta.*(seca|moida|flocos|po)", unit_g=None),
    dict(key="baunilha", aliases=["extrato de baunilha", "essência de baunilha", "vanilla", "açúcar baunilhado"], aisle=MERC, usda="Vanilla extract", match=r"(extrato|essencia|aroma|vagem|vagens) de baunilha|baunilha (em vagem|vagem|liquida)", avoid=r"iogurte|gelado|bolacha|cha|pudim", unit_g=None),
    dict(key="gelatina", aliases=["folhas de gelatina", "gelatin"], aisle=MERC, usda="Gelatins, dry powder, unsweetened", match=r"gelatina.*(folha|neutra|po)", avoid=r"sabor|morango|ananas|framboesa|limao|cereja", unit_g=2),
]
