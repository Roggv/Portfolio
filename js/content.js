/*
  All the content of the museum lives here.

  Projects: add an object to a room's `projects` list. Images go in
  assets/projects/<project>/, 16:9 works best.
  Rooms: add a room object. Rooms become halls off the Main Hall (left, far and
  right wall, numbered clockwise) and the building resizes to fit them.
  Catalogue numbers follow the order of the list. `no: 14` pins one.
  Text: a plain string is shown in every language (names, tool lists), L(en, ca, es)
  changes with the language. A missing translation falls back to English.
  Room descriptions should stay around 200 characters to fit the wall placard.
*/

const L = (en, ca, es) => ({ en, ca, es });

export const profile = {
  name: 'Roger Guixeras',
  role: L('Videogame Developer', 'Desenvolupador de videojocs', 'Desarrollador de videojuegos'),
  // since: 2024, // adds "Est. 2024" to the entrance wall and intro
  bio: L(
    'I make videogames, from gameplay systems to the worlds they live in. ' +
      "I've built games in Unity, Unreal Engine and Godot, " +
      'plus iOS and Android apps and a few websites.\n\n' +
      'I also model and animate in Blender, and edit video, images and a little audio. ' +
      'Each hall of this museum holds the work made with one tool. ' +
      'Walk up to a piece and press E to read more about it.',
    'Faig videojocs, des dels sistemes de joc fins als mons on viuen. ' +
      "He fet jocs amb Unity, Unreal Engine i Godot, " +
      "a més d'aplicacions per a iOS i Android i unes quantes pàgines web.\n\n" +
      "També modelo i animo amb Blender, i edito vídeo, imatges i una mica d'àudio. " +
      "Cada sala d'aquest museu reuneix el treball fet amb una eina. " +
      "Apropa't a una peça i prem E per saber-ne més.",
    'Hago videojuegos, desde los sistemas de juego hasta los mundos en los que viven. ' +
      'He hecho juegos con Unity, Unreal Engine y Godot, ' +
      'además de aplicaciones para iOS y Android y unas cuantas páginas web.\n\n' +
      'También modelo y animo con Blender, y edito vídeo, imágenes y un poco de audio. ' +
      'Cada sala de este museo reúne el trabajo hecho con una herramienta. ' +
      'Acércate a una pieza y pulsa E para saber más.',
  ),
  tools: ['Unreal Engine', 'Unity', 'Godot', 'Blender'], // programming languages have their own hall
  spoken: [L('Catalan', 'Català', 'Catalán'), L('Spanish', 'Castellà', 'Español'), L('English', 'Anglès', 'Inglés')],
  email: 'roger@guixeras.com', // '' hides it on the contact wall and page
  links: [
    { label: 'itch.io', url: 'https://rogergv.itch.io/' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/roger-guixeras/' },
    // { label: 'Discord', url: 'https://discord.com/users/319904789502754828' },
    // { label: 'GitHub', url: 'https://github.com/Roggv' }, // all repos are private for now
  ],
};

// Background music: files go in assets/audio/music/. One track loops, several play in turn.
export const music = {
  tracks: [
    // "Raining - Ambient Calm Piano Music (loop)" by HarumachiMusic, Pixabay Content License (no credit needed)
    { src: 'assets/audio/music/background-music.mp3' },
  ],
  level: 0.08, // share of the volume slider, 0 to 1
};

/*
  Project fields, only `title` is required (text can be L(en, ca, es)):
  {
    title, medium, tagline, description (\n\n between paragraphs),
    role, with: ['name'], context, highlights: ['text'],
    images: [{ src, aspect, caption }],   // first is the hero, the next two hang beside it, all show in the detail view
    video: 'assets/projects/x/loop.mp4',  // plays on a wall screen; a YouTube embed URL only shows in the detail view
    emblem: 'tank',                       // the sculpture in the aisle, see EMBLEMS in props.js
    sprite: { src, motion: 'spin' | 'bob', height },  // with emblem: 'sprite', for 2D games
    model: 'assets/projects/x/thing.glb', // a glTF model instead of an emblem, keep it under 3 MB
    tags: ['C#'],                         // linked to the matching language in the Languages room
    links: [{ label, url }],
    frame: 'gold',                        // gold | black | oak | white | silver
    card: { ground, accent, chips },      // painted card for projects without images
  }

  Room fields:
    title, subtitle, description,
    wall (colour), frame (default for the room), floor: oak | walnut | ash | birch | slate,
    mood: { light: 0.6, tint: '#ffcf9d' }  // 1 is normal, lower is dimmer
    projects: [...] or languages: [...]
*/

const PLAY_ON_ITCH = L('Play on itch.io', 'Juga a itch.io', 'Juega en itch.io');
const TITLE_SCREEN = L('Title screen', 'Pantalla de títol', 'Pantalla de título');

export const rooms = [
  // Unreal
  {
    title: 'Unreal Engine',
    subtitle: L('Survival horror, built for four', 'Terror de supervivència, pensat per a quatre', 'Terror de supervivencia, pensado para cuatro'),
    description: L(
      "Johnson's Mansion: an online co-op horror game made in Unreal Engine 5, where survivors rebuild a getaway car while something hunts them.",
      "Johnson's Mansion: un joc de terror cooperatiu en línia fet amb Unreal Engine 5, on els supervivents reconstrueixen un cotxe per fugir mentre alguna cosa els caça.",
      "Johnson's Mansion: un juego de terror cooperativo en línea hecho con Unreal Engine 5, en el que los supervivientes reconstruyen un coche para huir mientras algo los caza.",
    ),
    wall: '#4a1e24',
    frame: 'gold',
    floor: 'walnut',
    mood: { light: 0.62, tint: '#ffcf9d' },
    projects: [
      {
        title: "Johnson's Mansion",
        medium: L(
          'Unreal Engine 5 · Online multiplayer · Survival horror',
          'Unreal Engine 5 · Multijugador en línia · Terror de supervivència',
          'Unreal Engine 5 · Multijugador en línea · Terror de supervivencia',
        ),
        tagline: L(
          'Rebuild the getaway car before John Johnson finds you.',
          'Reconstrueix el cotxe per fugir abans que en John Johnson et trobi.',
          'Reconstruye el coche para huir antes de que John Johnson te encuentre.',
        ),
        description: L(
          "Johnson's Mansion is an online multiplayer survival-horror game. Players are trapped inside a sprawling mansion, and each one takes control of one of four characters, every one with their own unique abilities.\n\n" +
            'To escape, the team has to track down all the pieces of a car scattered around the house and put it back together. ' +
            'Meanwhile John Johnson patrols the rooms hunting for survivors, doing everything he can to stop them from getting away.\n\n' +
            'The screens show the lamp-lit library, the garage where the car waits under a dust sheet, John Johnson himself, and a top-down map of the whole house.',
          "Johnson's Mansion és un joc de terror de supervivència multijugador en línia. Els jugadors queden atrapats dins d'una mansió immensa i cadascun controla un de quatre personatges, tots amb habilitats úniques.\n\n" +
            "Per escapar, l'equip ha de trobar totes les peces d'un cotxe escampades per la casa i tornar-lo a muntar. " +
            'Mentrestant, en John Johnson patrulla les habitacions a la cerca de supervivents i fa tot el possible per impedir que s\'escapin.\n\n' +
            'Les captures mostren la biblioteca il·luminada per llums, el garatge on el cotxe espera sota un llençol, el mateix John Johnson i un mapa de tota la casa vist des de dalt.',
          "Johnson's Mansion es un juego de terror y supervivencia multijugador en línea. Los jugadores quedan atrapados dentro de una mansión inmensa y cada uno controla a uno de cuatro personajes, todos con habilidades únicas.\n\n" +
            'Para escapar, el equipo tiene que encontrar todas las piezas de un coche repartidas por la casa y volver a montarlo. ' +
            'Mientras tanto, John Johnson patrulla las habitaciones en busca de supervivientes y hace todo lo posible por impedir que escapen.\n\n' +
            'Las capturas muestran la biblioteca iluminada por lámparas, el garaje donde el coche espera bajo una sábana, al propio John Johnson y un mapa de toda la casa visto desde arriba.',
        ),
        with: ['Joan Hidalgo', 'Miquel Jimenez', 'Lluís Roura'],
        context: L('Team project · four developers', 'Projecte en equip · quatre desenvolupadors', 'Proyecto en equipo · cuatro desarrolladores'),
        highlights: [
          L('Online multiplayer for several survivors at once', 'Multijugador en línia per a diversos supervivents alhora', 'Multijugador en línea para varios supervivientes a la vez'),
          L('Four playable characters, each with unique abilities', 'Quatre personatges jugables, cadascun amb habilitats úniques', 'Cuatro personajes jugables, cada uno con habilidades únicas'),
          L('A patrolling enemy that hunts the players through the house', 'Un enemic que patrulla i caça els jugadors per la casa', 'Un enemigo que patrulla y caza a los jugadores por la casa'),
          L(
            'Collectible car parts that give the team a clear goal to work toward',
            "Peces de cotxe per recollir que donen a l'equip un objectiu clar",
            'Piezas de coche que recoger y que dan al equipo un objetivo claro',
          ),
        ],
        tags: ['Unreal Blueprints'],
        emblem: 'mansion',
        images: [
          { src: 'assets/projects/johnsons-mansion/library.jpg', aspect: 1.5351, caption: L('The library', 'La biblioteca', 'La biblioteca') },
          { src: 'assets/projects/johnsons-mansion/enemy.jpg', aspect: 0.8876, caption: L('John Johnson, the main enemy', "John Johnson, l'enemic principal", 'John Johnson, el enemigo principal') },
          { src: 'assets/projects/johnsons-mansion/map.jpg', aspect: 1.6148, caption: L('Top-down map of the mansion', 'Mapa de la mansió vist des de dalt', 'Mapa de la mansión visto desde arriba') },
          { src: 'assets/projects/johnsons-mansion/parking.jpg', aspect: 1.6746, caption: L('The garage, with the car under a dust sheet', 'El garatge, amb el cotxe sota un llençol', 'El garaje, con el coche bajo una sábana') },
        ],
      },
    ],
  },

  // Unity
  {
    title: 'Unity',
    subtitle: L('Physics, runners and virtual reality', 'Física, jocs de córrer i realitat virtual', 'Física, juegos de correr y realidad virtual'),
    description: L(
      'Three games made with Unity and C#: a ballistics tank shooter, a zombie runner and a roguelike played with your hands in VR.',
      'Tres jocs fets amb Unity i C#: un joc de tancs amb balística, un joc de córrer entre zombis i un roguelike que es juga amb les mans en VR.',
      'Tres juegos hechos con Unity y C#: un juego de tanques con balística, un juego de correr entre zombis y un roguelike que se juega con las manos en VR.',
    ),
    wall: '#1e2a42',
    frame: 'black',
    floor: 'slate',
    projects: [
      {
        title: 'La Oca VR',
        medium: L(
          'Unity · C# · XR Interaction Toolkit · Virtual reality',
          'Unity · C# · XR Interaction Toolkit · Realitat virtual',
          'Unity · C# · XR Interaction Toolkit · Realidad virtual',
        ),
        tagline: L(
          'Beat the devil at his own board game, one dice at a time.',
          "Guanya al diable al seu propi joc de taula, un dau darrere l'altre.",
          'Gana al diablo en su propio juego de mesa, un dado tras otro.',
        ),
        description: L(
          'You are a goose farmer who died in a ridiculous way and woke up in hell, face to face with the devil. His offer: win a game of La Oca, the classic Spanish goose board game, and you go back to the living. Lose, and you stay for eternity.\n\n' +
            'There is a twist. You play alone against a board the devil builds for you, and you have to complete it several times within a limited number of turns. Between rounds you shop for new dice and combine them into a build, roguelike style, until you break the game so thoroughly that the devil gives up. There are two endings: back to life, or hell forever.\n\n' +
            'Everything is physical. You throw the dice with your own hands, feed items to your goose, and pull a lever to buy dice in the shop. Buying takes two steps on purpose, because accidental clicks are far too easy in VR.',
          "Ets un granger d'oques que va morir d'una manera ridícula i es va despertar a l'infern, cara a cara amb el diable. La seva oferta: guanya una partida a l'Oca, el clàssic joc de taula, i tornaràs amb els vius. Si perds, et quedes per l'eternitat.\n\n" +
            "Hi ha un gir. Jugues sol contra un tauler que el diable construeix per a tu, i l'has de completar diverses vegades en un nombre limitat de torns. Entre rondes compres daus nous i els combines en una estratègia, a l'estil roguelike, fins que trenques el joc de tal manera que el diable es rendeix. Hi ha dos finals: tornar a la vida o l'infern per sempre.\n\n" +
            'Tot és físic. Llances els daus amb les teves pròpies mans, dones objectes a la teva oca i estires una palanca per comprar daus a la botiga. Comprar requereix dos passos expressament, perquè els clics accidentals són massa fàcils en VR.',
          'Eres un granjero de ocas que murió de una forma ridícula y despertó en el infierno, cara a cara con el diablo. Su oferta: gana una partida a La Oca, el clásico juego de mesa, y volverás con los vivos. Si pierdes, te quedas por toda la eternidad.\n\n' +
            'Hay un giro. Juegas solo contra un tablero que el diablo construye para ti, y tienes que completarlo varias veces en un número limitado de turnos. Entre rondas compras dados nuevos y los combinas en una estrategia, al estilo roguelike, hasta que rompes el juego de tal manera que el diablo se rinde. Hay dos finales: volver a la vida o el infierno para siempre.\n\n' +
            'Todo es físico. Lanzas los dados con tus propias manos, das objetos a tu oca y tiras de una palanca para comprar dados en la tienda. Comprar requiere dos pasos a propósito, porque los clics accidentales son demasiado fáciles en VR.',
        ),
        role: L(
          'VR implementation and testing, the game menus, and Scrum Master for the team.',
          "Implementació i proves de VR, els menús del joc i Scrum Master de l'equip.",
          'Implementación y pruebas de VR, los menús del juego y Scrum Master del equipo.',
        ),
        with: ['Naoki Sarrias', 'Lluís Pérez', 'Genís Gómez'],
        context: L(
          'Integrated Project III · Universitat de Vic, April 2026',
          'Projecte Integrat III · Universitat de Vic, abril de 2026',
          'Proyecto Integrado III · Universitat de Vic, abril de 2026',
        ),
        highlights: [
          L(
            'Decoupled architecture built on ScriptableObject game events and data assets',
            'Arquitectura desacoblada basada en esdeveniments de joc i recursos de dades amb ScriptableObject',
            'Arquitectura desacoplada basada en eventos de juego y recursos de datos con ScriptableObject',
          ),
          L(
            'Dice, tiles and modifiers split into data assets and plain C# logic, so new content needs no changes to existing code',
            'Daus, caselles i modificadors separats en recursos de dades i lògica C# simple, de manera que el contingut nou no obliga a canviar el codi existent',
            'Dados, casillas y modificadores separados en recursos de datos y lógica C# simple, de modo que el contenido nuevo no obliga a cambiar el código existente',
          ),
          L(
            "Board generated procedurally from each level's settings",
            'Tauler generat de manera procedimental a partir de la configuració de cada nivell',
            'Tablero generado de forma procedural a partir de la configuración de cada nivel',
          ),
          L(
            'Scoring from three pools: a sum, a multiplier and a final multiplier',
            'Puntuació a partir de tres grups: una suma, un multiplicador i un multiplicador final',
            'Puntuación a partir de tres grupos: una suma, un multiplicador y un multiplicador final',
          ),
          L(
            'A two-step shop, with buttons to select dice and a lever to confirm',
            'Una botiga en dos passos, amb botons per triar daus i una palanca per confirmar',
            'Una tienda en dos pasos, con botones para elegir dados y una palanca para confirmar',
          ),
        ],
        tags: ['C#'],
        emblem: 'dice',
        images: [
          { src: 'assets/projects/la-oca-vr/devil.png', aspect: 1.7649, caption: L('The devil, across the table', "El diable, a l'altra banda de la taula", 'El diablo, al otro lado de la mesa') },
          { src: 'assets/projects/la-oca-vr/poster.jpg', aspect: 0.5625, caption: L('Key art', 'Il·lustració promocional', 'Ilustración promocional') },
          { src: 'assets/projects/la-oca-vr/shop.png', aspect: 1.5366, caption: L('The dice shop', 'La botiga de daus', 'La tienda de dados') },
          { src: 'assets/projects/la-oca-vr/board.png', aspect: 1.9286, caption: L('The board, with dice rolling across it', 'El tauler, amb daus rodant per sobre', 'El tablero, con dados rodando por encima') },
          { src: 'assets/projects/la-oca-vr/title.png', aspect: 1.9562, caption: TITLE_SCREEN },
        ],
      },
      {
        title: 'Tank Wars',
        medium: L(
          'Unity · C# · Physics-based gameplay · NavMesh AI',
          'Unity · C# · Jugabilitat basada en la física · IA amb NavMesh',
          'Unity · C# · Jugabilidad basada en la física · IA con NavMesh',
        ),
        tagline: L(
          'Ballistics, accelerating tanks and rounds that keep getting harder.',
          'Balística, tancs que acceleren i rondes cada cop més difícils.',
          'Balística, tanques que aceleran y rondas cada vez más difíciles.',
        ),
        description: L(
          'A 3D tank combat game set on open terrain. To survive a round you destroy every enemy tank, and each new round brings more of them.\n\n' +
            'The project is a study in motion physics. The tank, its turret and every projectile follow uniformly accelerated motion, so things speed up and settle smoothly instead of snapping to a fixed velocity. A dashed line previews the arc of your shell before you fire, and the enemy turrets solve the same projectile equations to aim at you.',
          "Un joc de combat de tancs en 3D en un terreny obert. Per sobreviure a una ronda has de destruir tots els tancs enemics, i cada ronda nova en porta més.\n\n" +
            "El projecte és un estudi de la física del moviment. El tanc, la seva torreta i cada projectil segueixen un moviment uniformement accelerat, de manera que les coses agafen velocitat i s'aturen suaument en lloc de saltar a una velocitat fixa. Una línia discontínua mostra per endavant l'arc del projectil abans de disparar, i les torretes enemigues resolen les mateixes equacions de projectils per apuntar-te.",
          'Un juego de combate de tanques en 3D en un terreno abierto. Para sobrevivir a una ronda tienes que destruir todos los tanques enemigos, y cada ronda nueva trae más.\n\n' +
            'El proyecto es un estudio de la física del movimiento. El tanque, su torreta y cada proyectil siguen un movimiento uniformemente acelerado, de modo que las cosas cogen velocidad y se detienen con suavidad en lugar de saltar a una velocidad fija. Una línea discontinua muestra de antemano el arco del proyectil antes de disparar, y las torretas enemigas resuelven las mismas ecuaciones de proyectiles para apuntarte.',
        ),
        role: L(
          'The work was split equally between Lluís and me, with GitHub keeping our changes in sync.',
          "La feina es va repartir a parts iguals entre en Lluís i jo, i GitHub va mantenir sincronitzats els nostres canvis.",
          'El trabajo se repartió a partes iguales entre Lluís y yo, y GitHub mantuvo sincronizados nuestros cambios.',
        ),
        with: ['Lluís Pérez'],
        context: L(
          'Videogame Programming 3D · Universitat de Vic, January 2026',
          'Programació de videojocs 3D · Universitat de Vic, gener de 2026',
          'Programación de videojuegos 3D · Universitat de Vic, enero de 2026',
        ),
        highlights: [
          L(
            'Acceleration-based movement and turret rotation, with engine audio that follows the speed',
            "Moviment i rotació de la torreta basats en l'acceleració, amb l'àudio del motor que segueix la velocitat",
            'Movimiento y rotación de la torreta basados en la aceleración, con el audio del motor siguiendo la velocidad',
          ),
          L(
            'Predicted shell trajectory drawn as a dashed line',
            'Trajectòria prevista del projectil dibuixada com una línia discontínua',
            'Trayectoria prevista del proyectil dibujada como una línea discontinua',
          ),
          L(
            'Enemy AI with NavMesh movement, vision-based detection and ballistic aiming',
            'IA enemiga amb moviment NavMesh, detecció per visió i punteria balística',
            'IA enemiga con movimiento NavMesh, detección por visión y puntería balística',
          ),
          L(
            'Heart-based health and a round system that spawns more enemies each wave',
            'Salut en cors i un sistema de rondes que genera més enemics a cada onada',
            'Salud en corazones y un sistema de rondas que genera más enemigos en cada oleada',
          ),
          L(
            'Right-click zoom with a vignette and blur effect for precise aiming',
            'Zoom amb el botó dret amb efecte de vinyeta i desenfocament per apuntar amb precisió',
            'Zoom con el botón derecho con efecto de viñeta y desenfoque para apuntar con precisión',
          ),
        ],
        tags: ['C#'],
        emblem: 'tank',
        images: [
          { src: 'assets/projects/tank-wars/battlefield.png', aspect: 1.7809, caption: L('A shell lands in the distance', 'Un projectil cau a lluny', 'Un proyectil cae a lo lejos') },
          { src: 'assets/projects/tank-wars/aiming.png', aspect: 1.7814, caption: L("The dashed line previews the shell's path", 'La línia discontínua mostra el camí del projectil', 'La línea discontinua muestra el camino del proyectil') },
          { src: 'assets/projects/tank-wars/tunnel.png', aspect: 1.7809, caption: L('Leaving the tunnel', 'Sortint del túnel', 'Saliendo del túnel') },
        ],
      },
      {
        title: 'Z-Run',
        medium: L('Unity · C# · 3D runner', 'Unity · C# · Joc de córrer en 3D', 'Unity · C# · Juego de correr en 3D'),
        tagline: L(
          "Run 1000 metres to the safehouse, and don't stop for the zombies.",
          "Corre 1000 metres fins al refugi, i no t'aturis per als zombis.",
          'Corre 1000 metros hasta el refugio, y no te detengas por los zombis.',
        ),
        description: L(
          'A 3D runner set in a post-apocalyptic world overrun by zombies. You have to run 1000 metres along a bridge to a safehouse, steering around the zombies or jumping over them. It is inspired by Temple Run, except there are no coins to collect: all you have to do is survive.\n\n' +
            'The bridge is never rebuilt. It is a single piece of road that hops forward every time you touch a trigger, and each hop spawns a fresh horde of one or two zombies ahead of you. Zombies start walking toward you once you come within 15 units, and a close one has a one-in-three chance of letting out a shout. A first-person camera, with fog to hide the end of the bridge, can be toggled with C.\n\n' +
            'Reach the safehouse and you get the good ending; get bitten and you get the bad one.',
          "Un joc de córrer en 3D ambientat en un món postapocalíptic envaït de zombis. Has de córrer 1000 metres per un pont fins a un refugi, esquivant els zombis o saltant-los per sobre. S'inspira en Temple Run, però sense monedes per recollir: només has de sobreviure.\n\n" +
            "El pont mai es reconstrueix. És un únic tros de carretera que salta endavant cada cop que toques un activador, i cada salt genera una nova munió d'un o dos zombis davant teu. Els zombis comencen a caminar cap a tu quan t'hi acostes a menys de 15 unitats, i un de proper té una probabilitat d'un entre tres de deixar anar un crit. Es pot activar una càmera en primera persona, amb boira per amagar el final del pont, amb la tecla C.\n\n" +
            "Arriba al refugi i tindràs el bon final; deixa't mossegar i tindràs el dolent.",
          'Un juego de correr en 3D ambientado en un mundo postapocalíptico invadido por zombis. Tienes que correr 1000 metros por un puente hasta un refugio, esquivando a los zombis o saltándolos. Se inspira en Temple Run, pero sin monedas que recoger: lo único que tienes que hacer es sobrevivir.\n\n' +
            'El puente nunca se reconstruye. Es un único trozo de carretera que salta hacia delante cada vez que tocas un activador, y cada salto genera una nueva horda de uno o dos zombis delante de ti. Los zombis empiezan a caminar hacia ti cuando te acercas a menos de 15 unidades, y uno cercano tiene una probabilidad de una entre tres de soltar un grito. Se puede activar una cámara en primera persona, con niebla para ocultar el final del puente, con la tecla C.\n\n' +
            'Llega al refugio y tendrás el buen final; déjate morder y tendrás el malo.',
        ),
        role: L('A solo project: design, code and screens.', 'Un projecte en solitari: disseny, codi i pantalles.', 'Un proyecto en solitario: diseño, código y pantallas.'),
        context: L(
          'Multimedia, Applications and Videogames · Universitat de Vic, October 2025',
          'Multimèdia, Aplicacions i Videojocs · Universitat de Vic, octubre de 2025',
          'Multimedia, Aplicaciones y Videojuegos · Universitat de Vic, octubre de 2025',
        ),
        highlights: [
          L(
            'One reusable bridge instead of endless new map pieces, which keeps the scene light',
            "Un sol pont reutilitzable en lloc de peces de mapa noves sense fi, cosa que manté l'escena lleugera",
            'Un solo puente reutilizable en lugar de piezas de mapa nuevas sin fin, lo que mantiene la escena ligera',
          ),
          L(
            'Random zombie hordes placed so they never overlap each other',
            'Hordes de zombis aleatòries col·locades perquè mai se solapin',
            'Hordas de zombis aleatorias colocadas para que nunca se solapen',
          ),
          L(
            'Third-person and first-person cameras you can switch between',
            'Càmeres en tercera i en primera persona entre les quals es pot canviar',
            'Cámaras en tercera y primera persona entre las que se puede cambiar',
          ),
          L(
            'A distance counter, a title screen and two different endings',
            'Un comptador de distància, una pantalla de títol i dos finals diferents',
            'Un contador de distancia, una pantalla de título y dos finales distintos',
          ),
        ],
        tags: ['C#'],
        emblem: 'runner',
        images: [
          {
            src: 'assets/projects/z-run/first-person.png',
            aspect: 1.7834,
            caption: L(
              'First-person view, with fog hiding the end of the bridge',
              'Vista en primera persona, amb boira que amaga el final del pont',
              'Vista en primera persona, con niebla que oculta el final del puente',
            ),
          },
          { src: 'assets/projects/z-run/title.png', aspect: 1.7879, caption: TITLE_SCREEN },
          { src: 'assets/projects/z-run/goal.png', aspect: 1.7834, caption: L('The safehouse, at 997 m', 'El refugi, als 997 m', 'El refugio, a 997 m') },
          { src: 'assets/projects/z-run/controls.png', aspect: 1.7879, caption: L('Controls, shown in the game', 'Controls, mostrats al joc', 'Controles, mostrados en el juego') },
          { src: 'assets/projects/z-run/victory.png', aspect: 1.7899, caption: L('The good ending', 'El bon final', 'El buen final') },
          { src: 'assets/projects/z-run/game-over.png', aspect: 1.7834, caption: L('The bad ending', 'El mal final', 'El mal final') },
        ],
      },
    ],
  },

  // Godot
  {
    title: 'Godot',
    subtitle: L('Game jams, rhythm and shaders', 'Game jams, ritme i shaders', 'Game jams, ritmo y shaders'),
    description: L(
      'Small projects made in Godot: two game jam entries, a tango rhythm game for two players and a place to test shaders.',
      'Projectes petits fets amb Godot: dues participacions en game jams, un joc de ritme de tango per a dos jugadors i un espai per provar shaders.',
      'Proyectos pequeños hechos con Godot: dos participaciones en game jams, un juego de ritmo de tango para dos jugadores y un espacio para probar shaders.',
    ),
    wall: '#233a2f',
    frame: 'oak',
    floor: 'oak',
    projects: [
      {
        title: 'Cephalopod on the Clock',
        medium: 'Godot · GDScript · Game jam',
        tagline: L(
          "Spin to build up speed, and don't be late for work.",
          'Gira per agafar velocitat, i no arribis tard a la feina.',
          'Gira para coger velocidad, y no llegues tarde al trabajo.',
        ),
        description: L(
          'Made for The Very Serious Juniper Dev Game Jam. You are a cephalopod who is late for work, with only two minutes left to reach the office.\n\n' +
            'The only way to make it is to build up speed by spinning, then stop spinning to release that boost and let it carry you along the winding route through town. The screens show the title, the in-game tutorial, the whole route and the ending where you get to work in time.',
          "Fet per a la The Very Serious Juniper Dev Game Jam. Ets un cefalòpode que arriba tard a la feina, amb només dos minuts per arribar a l'oficina.\n\n" +
            "L'única manera d'aconseguir-ho és agafar velocitat girant i, després, deixar de girar per alliberar aquest impuls i deixar que et dugui pel camí serpentejant per la ciutat. Les captures mostren el títol, el tutorial del joc, tot el recorregut i el final en què arribes a la feina a temps.",
          'Hecho para la The Very Serious Juniper Dev Game Jam. Eres un cefalópodo que llega tarde al trabajo, con solo dos minutos para llegar a la oficina.\n\n' +
            'La única forma de conseguirlo es coger velocidad girando y, después, dejar de girar para liberar ese impulso y dejar que te lleve por el camino serpenteante por la ciudad. Las capturas muestran el título, el tutorial del juego, todo el recorrido y el final en el que llegas al trabajo a tiempo.',
        ),
        with: ['Genís Gómez'],
        context: 'The Very Serious Juniper Dev Game Jam',
        highlights: [
          L(
            'Momentum-based movement: spin to charge a boost, stop to release it',
            'Moviment basat en la inèrcia: gira per carregar un impuls, para per alliberar-lo',
            'Movimiento basado en la inercia: gira para cargar un impulso, para para liberarlo',
          ),
          L('A two-minute countdown to the office', "Un compte enrere de dos minuts fins a l'oficina", 'Una cuenta atrás de dos minutos hasta la oficina'),
        ],
        tags: ['GDScript'],
        links: [{ label: PLAY_ON_ITCH, url: 'https://rogergv.itch.io/cephalopod-on-the-clock' }],
        emblem: 'sprite',
        sprite: { src: 'assets/projects/cephalopod-on-the-clock/squid.png', motion: 'spin', height: 0.6 },
        images: [
          { src: 'assets/projects/cephalopod-on-the-clock/title.png', aspect: 1.7778, caption: TITLE_SCREEN },
          {
            src: 'assets/projects/cephalopod-on-the-clock/tutorial.png',
            aspect: 1.7778,
            caption: L(
              'Tutorial: keep spinning to build boost, stop to release it',
              'Tutorial: segueix girant per carregar impuls, para per alliberar-lo',
              'Tutorial: sigue girando para cargar impulso, para para liberarlo',
            ),
          },
          { src: 'assets/projects/cephalopod-on-the-clock/map.png', aspect: 1.4, caption: L('The route map', 'El mapa del recorregut', 'El mapa del recorrido') },
          { src: 'assets/projects/cephalopod-on-the-clock/win.png', aspect: 1.7778, caption: L('You got to work in time!', 'Has arribat a la feina a temps!', '¡Has llegado al trabajo a tiempo!') },
        ],
      },
      {
        title: 'My Baby Turned Out to Be a Level 999 Mage',
        medium: 'Godot · GDScript · Game jam',
        tagline: L(
          'Keep the baby safe until he unleashes his power.',
          'Mantén el nadó segur fins que alliberi el seu poder.',
          'Mantén al bebé a salvo hasta que libere su poder.',
        ),
        description: L(
          'Made for the GMTK Game Jam, whose theme was "Count down". You are in a dungeon, looking after a baby who happens to be an absurdly powerful mage.\n\n' +
            'Your job is to keep him safe by dodging the projectiles flying around the room until his attack is ready. When it finally goes off, it wipes out every enemy and lets you move on to the next room.',
          'Fet per a la GMTK Game Jam, el tema de la qual era «Compte enrere». Ets en una masmorra, cuidant un nadó que resulta ser un mag absurdament poderós.\n\n' +
            "La teva feina és mantenir-lo segur esquivant els projectils que volen per la sala fins que el seu atac estigui a punt. Quan per fi s'activa, elimina tots els enemics i et deixa passar a la sala següent.",
          'Hecho para la GMTK Game Jam, cuyo tema era «Cuenta atrás». Estás en una mazmorra, cuidando a un bebé que resulta ser un mago absurdamente poderoso.\n\n' +
            'Tu trabajo es mantenerlo a salvo esquivando los proyectiles que vuelan por la sala hasta que su ataque esté listo. Cuando por fin se activa, elimina a todos los enemigos y te deja pasar a la siguiente sala.',
        ),
        with: ['Genís Gómez'],
        context: L('GMTK Game Jam · theme: Count down', 'GMTK Game Jam · tema: compte enrere', 'GMTK Game Jam · tema: cuenta atrás'),
        highlights: [
          L(
            'The countdown is the game: survive until the big attack is ready',
            'El compte enrere és el joc: sobreviu fins que el gran atac estigui a punt',
            'La cuenta atrás es el juego: sobrevive hasta que el gran ataque esté listo',
          ),
          L(
            'Room-by-room progression, one dungeon room at a time',
            'Progressió sala per sala, una sala de la masmorra cada cop',
            'Progresión sala a sala, una sala de la mazmorra cada vez',
          ),
        ],
        tags: ['GDScript'],
        links: [{ label: PLAY_ON_ITCH, url: 'https://oopsg.itch.io/my-baby-turned-out-to-be-a-level-999-mage' }],
        emblem: 'sprite',
        sprite: { src: 'assets/projects/level-999-mage/baby.png', motion: 'bob', height: 0.72 },
        images: [
          { src: 'assets/projects/level-999-mage/gameplay.png', aspect: 1.7764, caption: L('Dodging projectiles in the dungeon', 'Esquivant projectils a la masmorra', 'Esquivando proyectiles en la mazmorra') },
          { src: 'assets/projects/level-999-mage/attack.png', aspect: 1.7791, caption: L('The big attack', 'El gran atac', 'El gran ataque') },
          { src: 'assets/projects/level-999-mage/title.png', aspect: 1.7764, caption: TITLE_SCREEN },
        ],
      },
      {
        title: 'Takes Two to Tango',
        medium: L(
          'Godot · GDScript · Rhythm game · Local co-op',
          'Godot · GDScript · Joc de ritme · Cooperatiu local',
          'Godot · GDScript · Juego de ritmo · Cooperativo local',
        ),
        tagline: L(
          'A rhythm duet for two players on one screen.',
          'Un duet de ritme per a dos jugadors en una sola pantalla.',
          'Un dúo de ritmo para dos jugadores en una sola pantalla.',
        ),
        description: L(
          'A rhythm game set to tango music, played in local co-op. Two players sit side by side and hit arrows in time with the song while a pair of dancers performs in the middle of the screen. Together they have to reach the end of the song with the best high score they can.\n\n' +
            'Every note is graded Missed, Okay, Good or Great, and the results screen adds up the score, the grades and the longest combo. Songs such as "Pasión Ardiente" are ready to play, while "Corazón Salvaje" is shown locked in the song select.',
          "Un joc de ritme amb música de tango, per jugar en cooperatiu local. Dos jugadors seuen un al costat de l'altre i piquen fletxes al compàs de la cançó mentre una parella de ballarins actua al centre de la pantalla. Junts han d'arribar al final de la cançó amb la millor puntuació possible.\n\n" +
            'Cada nota rep una qualificació («Missed», «Okay», «Good» o «Great»), i la pantalla de resultats suma la puntuació, les qualificacions i el combo més llarg. Cançons com «Pasión Ardiente» estan a punt per jugar, mentre que «Corazón Salvaje» apareix bloquejada a la selecció de cançons.',
          'Un juego de ritmo con música de tango, para jugar en cooperativo local. Dos jugadores se sientan uno al lado del otro y pulsan flechas al compás de la canción mientras una pareja de bailarines actúa en el centro de la pantalla. Juntos tienen que llegar al final de la canción con la mejor puntuación posible.\n\n' +
            'Cada nota recibe una calificación («Missed», «Okay», «Good» o «Great»), y la pantalla de resultados suma la puntuación, las calificaciones y el combo más largo. Canciones como «Pasión Ardiente» están listas para jugar, mientras que «Corazón Salvaje» aparece bloqueada en la selección de canciones.',
        ),
        with: ['Genís Gómez', 'Ferran Villà'],
        highlights: [
          L(
            'Local two-player co-op on a shared score',
            'Cooperatiu local per a dos jugadors amb puntuació compartida',
            'Cooperativo local para dos jugadores con puntuación compartida',
          ),
          L(
            'Timing grades (Missed, Okay, Good, Great) and combo tracking',
            'Qualificacions de precisió («Missed», «Okay», «Good», «Great») i seguiment de combos',
            'Calificaciones de precisión («Missed», «Okay», «Good», «Great») y seguimiento de combos',
          ),
          L('A song select with locked songs', 'Una selecció de cançons amb cançons bloquejades', 'Una selección de canciones con canciones bloqueadas'),
        ],
        tags: ['GDScript'],
        emblem: 'arrows',
        images: [
          {
            src: 'assets/projects/takes-two-to-tango/gameplay.png',
            aspect: 1.7778,
            caption: L('Two lanes of arrows, and the dancers in the middle', 'Dos carrils de fletxes, i els ballarins al mig', 'Dos carriles de flechas, y los bailarines en el medio'),
          },
          { src: 'assets/projects/takes-two-to-tango/menu.png', aspect: 1.7778, caption: L('Song select', 'Selecció de cançons', 'Selección de canciones') },
          {
            src: 'assets/projects/takes-two-to-tango/results.png',
            aspect: 1.7778,
            caption: L('Results: score, combo and hit grades', 'Resultats: puntuació, combo i qualificacions', 'Resultados: puntuación, combo y calificaciones'),
          },
        ],
      },
      {
        title: 'Shader Test',
        medium: L(
          'Godot · Godot Shading Language · 2D and 3D shaders',
          'Godot · Godot Shading Language · Shaders 2D i 3D',
          'Godot · Godot Shading Language · Shaders 2D y 3D',
        ),
        tagline: L(
          'A sandbox for learning how pixels get their colour.',
          'Un camp de proves per aprendre com els píxels agafen el color.',
          'Un campo de pruebas para aprender cómo obtienen su color los píxeles.',
        ),
        description: L(
          "A personal project for testing and learning shaders, in 2D and in 3D, written in Godot's own shading language.\n\n" +
            'The 2D side is a Shader Gallery: a menu of more than eighteen effects, including displacement, time and sine/cosine animation, colour mixing, scrolling backgrounds, flash, grayscale, masks, dissolve and distortion, each one applied to the Godot logo. The 3D side tries the basics on simple shapes, and a stylised grass shader covers a field with a path running through it.',
          'Un projecte personal per provar i aprendre shaders, en 2D i en 3D, escrits en el llenguatge de shaders propi de Godot.\n\n' +
            "La part en 2D és una Galeria de Shaders: un menú de més de divuit efectes, com ara desplaçament, animació amb el temps i amb sinus/cosinus, barreja de colors, fons que es desplacen, flaix, escala de grisos, màscares, dissolució i distorsió, cadascun aplicat al logotip de Godot. La part en 3D prova els fonaments amb formes simples, i un shader d'herba estilitzada cobreix un camp amb un camí que el travessa.",
          'Un proyecto personal para probar y aprender shaders, en 2D y en 3D, escritos en el lenguaje de shaders propio de Godot.\n\n' +
            'La parte en 2D es una Galería de Shaders: un menú de más de dieciocho efectos, como desplazamiento, animación con el tiempo y con seno/coseno, mezcla de colores, fondos que se desplazan, destello, escala de grises, máscaras, disolución y distorsión, cada uno aplicado al logotipo de Godot. La parte en 3D prueba los fundamentos con formas simples, y un shader de hierba estilizada cubre un campo atravesado por un camino.',
        ),
        role: L('A solo project, made to learn.', 'Un projecte en solitari, fet per aprendre.', 'Un proyecto en solitario, hecho para aprender.'),
        highlights: [
          L(
            'More than eighteen 2D effects in a browsable gallery',
            'Més de divuit efectes en 2D en una galeria explorable',
            'Más de dieciocho efectos en 2D en una galería explorable',
          ),
          L('3D shader basics on simple objects', 'Fonaments de shaders 3D en objectes simples', 'Fundamentos de shaders 3D en objetos simples'),
          L('A stylised grass shader', "Un shader d'herba estilitzada", 'Un shader de hierba estilizada'),
        ],
        tags: ['Godot Shading Language'],
        emblem: 'shader',
        images: [
          {
            src: 'assets/projects/shader-test/gallery-2d.png',
            aspect: 1.7778,
            caption: L(
              'The Shader Gallery, showing the dissolve effect',
              "La Galeria de Shaders, mostrant l'efecte de dissolució",
              'La Galería de Shaders, mostrando el efecto de disolución',
            ),
          },
          { src: 'assets/projects/shader-test/basics-3d.jpg', aspect: 1.7778, caption: L('3D shader basics', 'Fonaments de shaders 3D', 'Fundamentos de shaders 3D') },
          { src: 'assets/projects/shader-test/grass.jpg', aspect: 1.7778, caption: L('Stylised grass', 'Herba estilitzada', 'Hierba estilizada') },
        ],
      },
    ],
  },

  // Blender
  {
    title: 'Blender',
    subtitle: L('Low-poly worlds and characters', 'Mons i personatges low-poly', 'Mundos y personajes low-poly'),
    description: L(
      'The art side of the work: a looping animated tour of a dinosaur park, and a turntable of a low-poly swordsman.',
      "La part artística de la feina: un recorregut animat en bucle per un parc de dinosaures i un giratori d'un espadatxí low-poly.",
      'La parte artística del trabajo: un recorrido animado en bucle por un parque de dinosaurios y un giratorio de un espadachín low-poly.',
    ),
    wall: '#6b3520',
    frame: 'white',
    floor: 'birch',
    mood: { light: 1.12 },
    projects: [
      {
        title: 'Dinosaur Park',
        medium: L(
          'Blender · Low-poly modelling · Animation',
          'Blender · Modelatge low-poly · Animació',
          'Blender · Modelado low-poly · Animación',
        ),
        tagline: L(
          'A camera ride from a low-poly dinosaur park into its glowing laboratory.',
          "Un recorregut de càmera des d'un parc de dinosaures low-poly fins al seu laboratori lluminós.",
          'Un recorrido de cámara desde un parque de dinosaurios low-poly hasta su laboratorio luminoso.',
        ),
        description: L(
          'A looping animation made in Blender. The camera glides over a low-poly dinosaur park, with its monumental gate, a jeep on the road and clumps of trees, then drops inside the laboratory, where glowing green specimen tanks line the room, before looping seamlessly back to the gate.\n\n' +
            'The video is the full 23-second loop. The stills show the park and the lab as stand-alone dioramas.',
          "Una animació en bucle feta amb Blender. La càmera llisca per sobre d'un parc de dinosaures low-poly, amb la seva porta monumental, un jeep a la carretera i grups d'arbres, i després s'endinsa al laboratori, on tancs d'espècimens verds i lluminosos omplen la sala, abans de tornar sense talls a la porta.\n\n" +
            "El vídeo és el bucle complet de 23 segons. Les imatges fixes mostren el parc i el laboratori com a diorames independents.",
          'Una animación en bucle hecha con Blender. La cámara se desliza sobre un parque de dinosaurios low-poly, con su puerta monumental, un jeep en la carretera y grupos de árboles, y después entra en el laboratorio, donde tanques de especímenes verdes y luminosos llenan la sala, antes de volver sin cortes a la puerta.\n\n' +
            'El vídeo es el bucle completo de 23 segundos. Las imágenes fijas muestran el parque y el laboratorio como dioramas independientes.',
        ),
        highlights: [
          L('A seamless 23-second camera loop', 'Un bucle de càmera de 23 segons sense talls', 'Un bucle de cámara de 23 segundos sin cortes'),
          L(
            'Two modelled scenes: an open-air park and an indoor lab',
            "Dues escenes modelades: un parc a l'aire lliure i un laboratori interior",
            'Dos escenas modeladas: un parque al aire libre y un laboratorio interior',
          ),
          L(
            'Low-poly style with a mostly green palette',
            'Estil low-poly amb una paleta de colors dominada pel verd',
            'Estilo low-poly con una paleta de colores dominada por el verde',
          ),
        ],
        emblem: 'diorama',
        video: 'assets/projects/dinosaur-park/loop.mp4',
        images: [
          { src: 'assets/projects/dinosaur-park/park.jpg', aspect: 1.7766, caption: L('The park', 'El parc', 'El parque') },
          { src: 'assets/projects/dinosaur-park/lab.jpg', aspect: 1.7766, caption: L('The laboratory', 'El laboratori', 'El laboratorio') },
        ],
      },
      {
        title: 'Zoro',
        medium: L(
          'Blender · Low-poly character modelling',
          'Blender · Modelatge de personatges low-poly',
          'Blender · Modelado de personajes low-poly',
        ),
        tagline: L(
          'The three-sword swordsman, modelled in low poly.',
          "L'espadatxí de les tres espases, modelat en low-poly.",
          'El espadachín de las tres espadas, modelado en low-poly.',
        ),
        description: L(
          'A low-poly model of Roronoa Zoro from One Piece, made in Blender. The stylised, faceted look keeps the character readable at a glance: the green hair and sash, the gold earrings and, of course, all three swords, one of them held in his teeth.\n\n' +
            'The turntable loop spins him around so you can judge the silhouette from every side.',
          "Un model low-poly de Roronoa Zoro, de One Piece, fet amb Blender. L'aspecte estilitzat i facetat manté el personatge llegible d'un cop d'ull: els cabells i la faixa verds, les arracades d'or i, és clar, les tres espases, una d'elles subjectada amb les dents.\n\n" +
            'El bucle giratori el fa girar perquè puguis valorar la silueta des de tots els costats.',
          'Un modelo low-poly de Roronoa Zoro, de One Piece, hecho con Blender. El aspecto estilizado y facetado mantiene al personaje legible de un vistazo: el pelo y la faja verdes, los pendientes de oro y, por supuesto, las tres espadas, una de ellas sujeta con los dientes.\n\n' +
            'El bucle giratorio lo hace girar para que puedas valorar la silueta desde todos los lados.',
        ),
        highlights: [
          L('Character modelling in a low-poly style', 'Modelatge de personatges amb estil low-poly', 'Modelado de personajes con estilo low-poly'),
          L(
            'A turntable loop to show the silhouette from all angles',
            'Un bucle giratori per mostrar la silueta des de tots els angles',
            'Un bucle giratorio para mostrar la silueta desde todos los ángulos',
          ),
        ],
        emblem: 'zoro',
        video: 'assets/projects/zoro/loop.mp4',
        images: [
          { src: 'assets/projects/zoro/full-body.jpg', aspect: 1.7766, caption: L('Full body', 'Cos sencer', 'Cuerpo entero') },
          { src: 'assets/projects/zoro/face.jpg', aspect: 1.7766, caption: L('Face close-up', 'Primer pla de la cara', 'Primer plano de la cara') },
        ],
      },
    ],
  },

  // Web
  {
    title: 'Web',
    subtitle: L('Sites made to learn the stack', 'Webs fetes per aprendre la tecnologia', 'Webs hechas para aprender la tecnología'),
    description: L(
      'A Laravel game store and a WordPress site: back ends, databases and plenty of CSS. Both were built to learn how the web fits together.',
      'Una botiga de jocs amb Laravel i una web amb WordPress: back ends, bases de dades i molt de CSS. Totes dues es van fer per aprendre com encaixa la web.',
      'Una tienda de juegos con Laravel y una web con WordPress: back ends, bases de datos y mucho CSS. Ambas se hicieron para aprender cómo encaja la web.',
    ),
    wall: '#3b2d52',
    frame: 'silver',
    floor: 'ash',
    projects: [
      {
        title: 'PlayNexus',
        medium: 'Laravel 12 · PHP · Tailwind CSS · SQLite',
        tagline: L(
          'A game store with a cart, a wallet and a personal library.',
          'Una botiga de jocs amb carret, moneder i biblioteca personal.',
          'Una tienda de juegos con carrito, monedero y biblioteca personal.',
        ),
        description: L(
          "PlayNexus is a digital game store built with Laravel. Visitors browse a catalogue of games, read each game's description in Catalan, Spanish or English, add games to a cart and check out with the balance in their virtual wallet. Everything they buy ends up in a personal library.\n\n" +
            'An admin panel lets administrators add, edit and delete games, and Laravel Breeze handles registration, login and password reset.\n\n' +
            "The screens show the store, a game's page, the cart with its total and the admin form for adding a game. The interface is in Catalan.",
          "PlayNexus és una botiga digital de jocs feta amb Laravel. Els visitants exploren un catàleg de jocs, llegeixen la descripció de cada joc en català, castellà o anglès, afegeixen jocs al carret i paguen amb el saldo del seu moneder virtual. Tot el que compren acaba en una biblioteca personal.\n\n" +
            "Un tauler d'administració permet als administradors afegir, editar i eliminar jocs, i Laravel Breeze gestiona el registre, l'inici de sessió i la recuperació de contrasenya.\n\n" +
            "Les captures mostren la botiga, la pàgina d'un joc, el carret amb el total i el formulari d'administració per afegir un joc. La interfície és en català.",
          'PlayNexus es una tienda digital de juegos hecha con Laravel. Los visitantes exploran un catálogo de juegos, leen la descripción de cada juego en catalán, castellano o inglés, añaden juegos al carrito y pagan con el saldo de su monedero virtual. Todo lo que compran acaba en una biblioteca personal.\n\n' +
            'Un panel de administración permite a los administradores añadir, editar y eliminar juegos, y Laravel Breeze se encarga del registro, el inicio de sesión y la recuperación de contraseña.\n\n' +
            'Las capturas muestran la tienda, la página de un juego, el carrito con su total y el formulario de administración para añadir un juego. La interfaz está en catalán.',
        ),
        highlights: [
          L(
            'Catalogue, cart, wallet and checkout, with a personal game library for each user',
            'Catàleg, carret, moneder i pagament, amb una biblioteca personal de jocs per a cada usuari',
            'Catálogo, carrito, monedero y pago, con una biblioteca personal de juegos para cada usuario',
          ),
          L(
            'Admin-only panel to create, edit and delete games',
            'Tauler només per a administradors per crear, editar i eliminar jocs',
            'Panel solo para administradores para crear, editar y eliminar juegos',
          ),
          L(
            'Three languages (Catalan, Spanish, English) with a language selector',
            "Tres idiomes (català, castellà, anglès) amb un selector d'idioma",
            'Tres idiomas (catalán, castellano, inglés) con un selector de idioma',
          ),
          L(
            'Authentication with Laravel Breeze, styled with Tailwind CSS',
            'Autenticació amb Laravel Breeze, amb estil de Tailwind CSS',
            'Autenticación con Laravel Breeze, con estilo de Tailwind CSS',
          ),
        ],
        tags: ['PHP', 'SQL'],
        emblem: 'cases',
        images: [
          { src: 'assets/projects/playnexus/store.jpg', aspect: 1.7766, caption: L('The store', 'La botiga', 'La tienda') },
          { src: 'assets/projects/playnexus/game.jpg', aspect: 1.7766, caption: L("A game's page", "La pàgina d'un joc", 'La página de un juego') },
          { src: 'assets/projects/playnexus/cart.jpg', aspect: 1.7766, caption: L('The cart, with the wallet balance', 'El carret, amb el saldo del moneder', 'El carrito, con el saldo del monedero') },
          {
            src: 'assets/projects/playnexus/admin.jpg',
            aspect: 1.7766,
            caption: L('The admin form for adding a game', "El formulari d'administració per afegir un joc", 'El formulario de administración para añadir un juego'),
          },
          { src: 'assets/projects/playnexus/library.jpg', aspect: 1.7766, caption: L("A user's library", "La biblioteca d'un usuari", 'La biblioteca de un usuario') },
        ],
      },
      {
        title: 'Estudiants Vic',
        medium: 'WordPress · All-in-One WP Migration',
        tagline: L(
          'A WordPress site for student housing in Vic, built for a marketing project.',
          "Una web de WordPress per a pisos d'estudiants a Vic, feta per a un projecte de màrqueting.",
          'Una web de WordPress para pisos de estudiantes en Vic, hecha para un proyecto de márketing.',
        ),
        description: L(
          'A website for Estudiants Vic, made with WordPress as a marketing project. It presents student housing in Vic: the rooms, the shared kitchen and dining room, the surroundings, and practical details such as the deposit and the paperwork.\n\n' +
            'It was built with the Astra theme and the Elementor and Kadence page builders, and exported with the All-in-One WP Migration plugin, which packs the whole site into a single archive so it can be moved between servers.',
          "Una web per a Estudiants Vic, feta amb WordPress com a projecte de màrqueting. Presenta els pisos d'estudiants a Vic: les habitacions, la cuina i el menjador compartits, l'entorn i detalls pràctics com la fiança i la paperassa.\n\n" +
            "Es va construir amb el tema Astra i els maquetadors Elementor i Kadence, i es va exportar amb el connector All-in-One WP Migration, que empaqueta tot el web en un sol arxiu perquè es pugui moure entre servidors.",
          'Una web para Estudiants Vic, hecha con WordPress como proyecto de márketing. Presenta los pisos de estudiantes en Vic: las habitaciones, la cocina y el comedor compartidos, el entorno y detalles prácticos como la fianza y el papeleo.\n\n' +
            'Se construyó con el tema Astra y los maquetadores Elementor y Kadence, y se exportó con el plugin All-in-One WP Migration, que empaqueta toda la web en un solo archivo para poder moverla entre servidores.',
        ),
        emblem: 'browser',
        card: { ground: '#162f3a', accent: '#6fd0d8', chips: ['WordPress', 'Astra', 'Elementor'] },
      },
    ],
  },

  // Languages
  {
    title: L('Languages', 'Llenguatges', 'Lenguajes'),
    subtitle: L('The tools behind the tools', 'Les eines darrere de les eines', 'Las herramientas detrás de las herramientas'),
    description: L(
      'The programming languages I have worked with, each cast as a small sculpture. Press E on one to see where I used it.',
      "Els llenguatges de programació amb què he treballat, cadascun convertit en una petita escultura. Prem E sobre un per veure on l'he fet servir.",
      'Los lenguajes de programación con los que he trabajado, cada uno convertido en una pequeña escultura. Pulsa E sobre uno para ver dónde lo he usado.',
    ),
    wall: '#d8d2c6',
    floor: 'birch',
    // Language fields: name (what project `tags` match), field, note, color,
    // glyph (the 3D letters, keep it short) or shape: torusKnot | icosahedron | octahedron |
    // dodecahedron | torus | cone | capsule | box | sphere
    languages: [
      {
        name: 'C#',
        glyph: 'C#',
        field: L('Unity · Games', 'Unity · Jocs', 'Unity · Juegos'),
        note: L(
          'Gameplay, physics, AI and VR in Unity: Tank Wars, Z-Run and La Oca VR.',
          'Jugabilitat, física, IA i VR a Unity: Tank Wars, Z-Run i La Oca VR.',
          'Jugabilidad, física, IA y VR en Unity: Tank Wars, Z-Run y La Oca VR.',
        ),
        color: '#8a5cc2',
      },
      {
        name: 'C++',
        glyph: 'C++',
        field: L('Low-level code', 'Codi de baix nivell', 'Código de bajo nivel'),
        note: L(
          'A fast, compiled language that gives you close control over the machine. It is also what Unreal Engine itself is written in.',
          'Un llenguatge compilat i ràpid que dona un control molt proper de la màquina. També és el llenguatge en què està escrit el mateix Unreal Engine.',
          'Un lenguaje compilado y rápido que da un control muy cercano de la máquina. También es el lenguaje en el que está escrito el propio Unreal Engine.',
        ),
        color: '#5b7fc7',
      },
      {
        name: 'Unreal Blueprints',
        glyph: 'BP',
        field: 'Unreal Engine',
        note: L(
          "Unreal's visual scripting, used to build gameplay for Johnson's Mansion.",
          "El sistema de programació visual d'Unreal, usat per construir la jugabilitat de Johnson's Mansion.",
          "La programación visual de Unreal, usada para construir la jugabilidad de Johnson's Mansion.",
        ),
        color: '#3f6fd8',
      },
      {
        name: 'GDScript',
        glyph: 'GD',
        field: L('Godot · Games', 'Godot · Jocs', 'Godot · Juegos'),
        note: L(
          'Game jam entries and prototypes in Godot.',
          'Participacions en game jams i prototips a Godot.',
          'Participaciones en game jams y prototipos en Godot.',
        ),
        color: '#4f9bb8',
      },
      {
        name: 'Godot Shading Language',
        glyph: 'GSL',
        field: 'Godot · Shaders',
        note: L(
          'Shader experiments in 2D and 3D, from dissolve effects to stylised grass.',
          "Experiments amb shaders en 2D i 3D, des d'efectes de dissolució fins a herba estilitzada.",
          'Experimentos con shaders en 2D y 3D, desde efectos de disolución hasta hierba estilizada.',
        ),
        color: '#c2553f',
      },
      {
        name: 'Swift',
        glyph: 'Swift',
        field: L('iOS apps', 'Apps per a iOS', 'Apps para iOS'),
        note: L('Native apps for iPhone and iPad.', 'Aplicacions natives per a iPhone i iPad.', 'Aplicaciones nativas para iPhone y iPad.'),
        color: '#e8743b',
      },
      {
        name: 'Kotlin',
        glyph: 'Kt',
        field: L('Android apps', 'Apps per a Android', 'Apps para Android'),
        note: L('Native apps for Android.', 'Aplicacions natives per a Android.', 'Aplicaciones nativas para Android.'),
        color: '#7f5fd6',
      },
      {
        name: 'SQL',
        glyph: 'SQL',
        field: L('Databases', 'Bases de dades', 'Bases de datos'),
        note: L(
          'The data behind web apps like PlayNexus.',
          "Les dades que hi ha darrere d'aplicacions web com PlayNexus.",
          'Los datos que hay detrás de aplicaciones web como PlayNexus.',
        ),
        color: '#3f9d8a',
      },
      {
        name: 'R',
        glyph: 'R',
        field: L('Data', 'Dades', 'Datos'),
        note: L('Data analysis and statistics.', 'Anàlisi de dades i estadística.', 'Análisis de datos y estadística.'),
        color: '#4a7fb5',
      },
      {
        name: 'PHP',
        glyph: 'PHP',
        field: L('Web back ends', 'Back ends web', 'Back ends web'),
        note: L(
          'The language behind Laravel and WordPress, used to build PlayNexus.',
          'El llenguatge que hi ha darrere de Laravel i WordPress, usat per construir PlayNexus.',
          'El lenguaje que hay detrás de Laravel y WordPress, usado para construir PlayNexus.',
        ),
        color: '#7a86b8',
      },
      {
        name: 'JavaScript',
        glyph: 'JS',
        field: L('Web front ends', 'Front ends web', 'Front ends web'),
        note: L(
          'Interactivity for the web, and the language this museum is written in.',
          "La interactivitat de la web, i el llenguatge amb què s'ha escrit aquest museu.",
          'La interactividad de la web, y el lenguaje en el que está escrito este museo.',
        ),
        color: '#d1b13c',
      },
      {
        name: 'CSS',
        glyph: 'CSS',
        field: L('Web styling', 'Estils web', 'Estilos web'),
        note: L('Layout and styling, written by hand.', 'Maquetació i estils, escrits a mà.', 'Maquetación y estilos, escritos a mano.'),
        color: '#3b8fd0',
      },
      {
        name: 'SCSS',
        glyph: 'SCSS',
        field: L('Web styling', 'Estils web', 'Estilos web'),
        note: L('CSS with variables, nesting and mixins.', 'CSS amb variables, imbricació i mixins.', 'CSS con variables, anidación y mixins.'),
        color: '#d0558f',
      },
    ],
  },
];
