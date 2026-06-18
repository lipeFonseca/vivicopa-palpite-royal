export interface Selecao {
  id: string;
  nome: string;
  grupo: string;
  bandeiraEmoji: string;
  tecnico: string;
  jogadores: string[];
}

export interface Jogo {
  id: string;
  rodada: 1 | 2 | 3;
  grupo: string;
  data: string; // YYYY-MM-DD (horário de Brasília)
  hora: string; // HH:MM (horário de Brasília)
  estadio: string;
  cidade: string;
  selecaoA: string;
  selecaoB: string;
}

// 48 seleções da Copa do Mundo FIFA 2026 — editáveis manualmente.
export const selecoes: Selecao[] = [
  // Grupo A
  { id: "mex", nome: "México", grupo: "A", bandeiraEmoji: "🇲🇽", tecnico: "Javier Aguirre", jogadores: ["Guillermo Ochoa", "Edson Álvarez", "Hirving Lozano", "Raúl Jiménez", "Santiago Giménez"] },
  { id: "rsa", nome: "África do Sul", grupo: "A", bandeiraEmoji: "🇿🇦", tecnico: "Hugo Broos", jogadores: ["Ronwen Williams", "Percy Tau", "Themba Zwane", "Teboho Mokoena", "Lyle Foster"] },
  { id: "kor", nome: "Coreia do Sul", grupo: "A", bandeiraEmoji: "🇰🇷", tecnico: "Hong Myung-bo", jogadores: ["Son Heung-min", "Kim Min-jae", "Lee Kang-in", "Hwang Hee-chan", "Cho Gue-sung"] },
  { id: "cze", nome: "República Tcheca", grupo: "A", bandeiraEmoji: "🇨🇿", tecnico: "Ivan Hašek", jogadores: ["Patrik Schick", "Tomáš Souček", "Vladimír Coufal", "Adam Hložek", "Lukáš Provod"] },

  // Grupo B
  { id: "can", nome: "Canadá", grupo: "B", bandeiraEmoji: "🇨🇦", tecnico: "Jesse Marsch", jogadores: ["Alphonso Davies", "Jonathan David", "Stephen Eustáquio", "Tajon Buchanan", "Cyle Larin"] },
  { id: "bih", nome: "Bósnia e Herzegovina", grupo: "B", bandeiraEmoji: "🇧🇦", tecnico: "Sergej Barbarez", jogadores: ["Edin Džeko", "Miralem Pjanić", "Sead Kolašinac", "Ermedin Demirović", "Amar Dedić"] },
  { id: "qat", nome: "Catar", grupo: "B", bandeiraEmoji: "🇶🇦", tecnico: "Bartolomé Márquez", jogadores: ["Akram Afif", "Almoez Ali", "Hassan Al-Haydos", "Boualem Khoukhi", "Saad Al-Sheeb"] },
  { id: "sui", nome: "Suíça", grupo: "B", bandeiraEmoji: "🇨🇭", tecnico: "Murat Yakin", jogadores: ["Granit Xhaka", "Manuel Akanji", "Breel Embolo", "Yann Sommer", "Xherdan Shaqiri"] },

  // Grupo C
  { id: "bra", nome: "Brasil", grupo: "C", bandeiraEmoji: "🇧🇷", tecnico: "Carlo Ancelotti", jogadores: ["Alisson", "Marquinhos", "Vinícius Júnior", "Rodrygo", "Raphinha", "Neymar"] },
  { id: "mar", nome: "Marrocos", grupo: "C", bandeiraEmoji: "🇲🇦", tecnico: "Walid Regragui", jogadores: ["Yassine Bounou", "Achraf Hakimi", "Hakim Ziyech", "Youssef En-Nesyri", "Brahim Díaz"] },
  { id: "hai", nome: "Haiti", grupo: "C", bandeiraEmoji: "🇭🇹", tecnico: "Sébastien Migné", jogadores: ["Duckens Nazon", "Frantzdy Pierrot", "Carl Sainté", "Ricardo Adé", "Johnny Placide"] },
  { id: "sco", nome: "Escócia", grupo: "C", bandeiraEmoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", tecnico: "Steve Clarke", jogadores: ["Andy Robertson", "Scott McTominay", "John McGinn", "Kieran Tierney", "Che Adams"] },

  // Grupo D
  { id: "usa", nome: "Estados Unidos", grupo: "D", bandeiraEmoji: "🇺🇸", tecnico: "Mauricio Pochettino", jogadores: ["Christian Pulisic", "Tyler Adams", "Weston McKennie", "Tim Weah", "Folarin Balogun"] },
  { id: "par", nome: "Paraguai", grupo: "D", bandeiraEmoji: "🇵🇾", tecnico: "Gustavo Alfaro", jogadores: ["Gustavo Gómez", "Miguel Almirón", "Antonio Sanabria", "Julio Enciso", "Damián Bobadilla"] },
  { id: "aus", nome: "Austrália", grupo: "D", bandeiraEmoji: "🇦🇺", tecnico: "Tony Popovic", jogadores: ["Mat Ryan", "Harry Souttar", "Aaron Mooy", "Mitchell Duke", "Riley McGree"] },
  { id: "tur", nome: "Turquia", grupo: "D", bandeiraEmoji: "🇹🇷", tecnico: "Vincenzo Montella", jogadores: ["Hakan Çalhanoğlu", "Arda Güler", "Kenan Yıldız", "Merih Demiral", "Kerem Aktürkoğlu"] },

  // Grupo E
  { id: "ger", nome: "Alemanha", grupo: "E", bandeiraEmoji: "🇩🇪", tecnico: "Julian Nagelsmann", jogadores: ["Manuel Neuer", "Joshua Kimmich", "Jamal Musiala", "Florian Wirtz", "Kai Havertz"] },
  { id: "cur", nome: "Curaçau", grupo: "E", bandeiraEmoji: "🇨🇼", tecnico: "Dick Advocaat", jogadores: ["Leandro Bacuna", "Juninho Bacuna", "Eloy Room", "Cuco Martina", "Tahith Chong"] },
  { id: "civ", nome: "Costa do Marfim", grupo: "E", bandeiraEmoji: "🇨🇮", tecnico: "Emerse Faé", jogadores: ["Franck Kessié", "Sébastien Haller", "Simon Adingra", "Évan Ndicka", "Nicolas Pépé"] },
  { id: "ecu", nome: "Equador", grupo: "E", bandeiraEmoji: "🇪🇨", tecnico: "Sebastián Beccacece", jogadores: ["Moisés Caicedo", "Enner Valencia", "Pervis Estupiñán", "Piero Hincapié", "Kendry Páez"] },

  // Grupo F
  { id: "ned", nome: "Holanda", grupo: "F", bandeiraEmoji: "🇳🇱", tecnico: "Ronald Koeman", jogadores: ["Virgil van Dijk", "Frenkie de Jong", "Memphis Depay", "Cody Gakpo", "Xavi Simons"] },
  { id: "jpn", nome: "Japão", grupo: "F", bandeiraEmoji: "🇯🇵", tecnico: "Hajime Moriyasu", jogadores: ["Takefusa Kubo", "Wataru Endo", "Kaoru Mitoma", "Daichi Kamada", "Ayase Ueda"] },
  { id: "swe", nome: "Suécia", grupo: "F", bandeiraEmoji: "🇸🇪", tecnico: "Graham Potter", jogadores: ["Alexander Isak", "Viktor Gyökeres", "Dejan Kulusevski", "Lucas Bergvall", "Anthony Elanga"] },
  { id: "tun", nome: "Tunísia", grupo: "F", bandeiraEmoji: "🇹🇳", tecnico: "Sami Trabelsi", jogadores: ["Aïssa Laïdouni", "Hannibal Mejbri", "Wahbi Khazri", "Youssef Msakni", "Ellyes Skhiri"] },

  // Grupo G
  { id: "bel", nome: "Bélgica", grupo: "G", bandeiraEmoji: "🇧🇪", tecnico: "Rudi Garcia", jogadores: ["Kevin De Bruyne", "Romelu Lukaku", "Thibaut Courtois", "Jérémy Doku", "Youri Tielemans"] },
  { id: "egy", nome: "Egito", grupo: "G", bandeiraEmoji: "🇪🇬", tecnico: "Hossam Hassan", jogadores: ["Mohamed Salah", "Mohamed Elneny", "Trezeguet", "Omar Marmoush", "Mostafa Mohamed"] },
  { id: "irn", nome: "Irã", grupo: "G", bandeiraEmoji: "🇮🇷", tecnico: "Amir Ghalenoei", jogadores: ["Mehdi Taremi", "Sardar Azmoun", "Alireza Jahanbakhsh", "Saman Ghoddos", "Alireza Beiranvand"] },
  { id: "nzl", nome: "Nova Zelândia", grupo: "G", bandeiraEmoji: "🇳🇿", tecnico: "Darren Bazeley", jogadores: ["Chris Wood", "Marko Stamenić", "Liberato Cacace", "Kosta Barbarouses", "Elijah Just"] },

  // Grupo H
  { id: "esp", nome: "Espanha", grupo: "H", bandeiraEmoji: "🇪🇸", tecnico: "Luis de la Fuente", jogadores: ["Lamine Yamal", "Pedri", "Rodri", "Nico Williams", "Álvaro Morata"] },
  { id: "cpv", nome: "Cabo Verde", grupo: "H", bandeiraEmoji: "🇨🇻", tecnico: "Bubista", jogadores: ["Ryan Mendes", "Vozinha", "Stopira", "Garry Rodrigues", "Bebé"] },
  { id: "ksa", nome: "Arábia Saudita", grupo: "H", bandeiraEmoji: "🇸🇦", tecnico: "Hervé Renard", jogadores: ["Salem Al-Dawsari", "Saleh Al-Shehri", "Mohammed Kanno", "Salman Al-Faraj", "Sultan Al-Ghannam"] },
  { id: "uru", nome: "Uruguai", grupo: "H", bandeiraEmoji: "🇺🇾", tecnico: "Marcelo Bielsa", jogadores: ["Federico Valverde", "Darwin Núñez", "Ronald Araújo", "Giorgian de Arrascaeta", "Maximiliano Araújo"] },

  // Grupo I
  { id: "fra", nome: "França", grupo: "I", bandeiraEmoji: "🇫🇷", tecnico: "Didier Deschamps", jogadores: ["Kylian Mbappé", "Antoine Griezmann", "Aurélien Tchouaméni", "William Saliba", "Ousmane Dembélé"] },
  { id: "sen", nome: "Senegal", grupo: "I", bandeiraEmoji: "🇸🇳", tecnico: "Pape Thiaw", jogadores: ["Sadio Mané", "Kalidou Koulibaly", "Édouard Mendy", "Ismaïla Sarr", "Nicolas Jackson"] },
  { id: "irq", nome: "Iraque", grupo: "I", bandeiraEmoji: "🇮🇶", tecnico: "Graham Arnold", jogadores: ["Aymen Hussein", "Ali Al-Hamadi", "Zidane Iqbal", "Ibrahim Bayesh", "Jalal Hassan"] },
  { id: "nor", nome: "Noruega", grupo: "I", bandeiraEmoji: "🇳🇴", tecnico: "Ståle Solbakken", jogadores: ["Erling Haaland", "Martin Ødegaard", "Alexander Sørloth", "Antonio Nusa", "Oscar Bobb"] },

  // Grupo J
  { id: "aut", nome: "Áustria", grupo: "J", bandeiraEmoji: "🇦🇹", tecnico: "Ralf Rangnick", jogadores: ["David Alaba", "Marcel Sabitzer", "Marko Arnautović", "Konrad Laimer", "Christoph Baumgartner"] },
  { id: "jor", nome: "Jordânia", grupo: "J", bandeiraEmoji: "🇯🇴", tecnico: "Jamal Sellami", jogadores: ["Musa Al-Taamari", "Yazan Al-Naimat", "Mahmoud Al-Mardi", "Nour Al-Rawabdeh", "Ehsan Haddad"] },
  { id: "arg", nome: "Argentina", grupo: "J", bandeiraEmoji: "🇦🇷", tecnico: "Lionel Scaloni", jogadores: ["Lionel Messi", "Emiliano Martínez", "Julián Álvarez", "Enzo Fernández", "Lautaro Martínez"] },
  { id: "alg", nome: "Argélia", grupo: "J", bandeiraEmoji: "🇩🇿", tecnico: "Vladimir Petković", jogadores: ["Riyad Mahrez", "Ismaël Bennacer", "Saïd Benrahma", "Houssem Aouar", "Baghdad Bounedjah"] },

  // Grupo K
  { id: "por", nome: "Portugal", grupo: "K", bandeiraEmoji: "🇵🇹", tecnico: "Roberto Martínez", jogadores: ["Cristiano Ronaldo", "Bruno Fernandes", "Bernardo Silva", "Rúben Dias", "Rafael Leão"] },
  { id: "cod", nome: "Rep. Dem. do Congo", grupo: "K", bandeiraEmoji: "🇨🇩", tecnico: "Sébastien Desabre", jogadores: ["Cédric Bakambu", "Chancel Mbemba", "Yoane Wissa", "Théo Bongonda", "Arthur Masuaku"] },
  { id: "uzb", nome: "Uzbequistão", grupo: "K", bandeiraEmoji: "🇺🇿", tecnico: "Timur Kapadze", jogadores: ["Eldor Shomurodov", "Abbosbek Fayzullaev", "Otabek Shukurov", "Khojimat Erkinov", "Jasur Yakhshiboev"] },
  { id: "col", nome: "Colômbia", grupo: "K", bandeiraEmoji: "🇨🇴", tecnico: "Néstor Lorenzo", jogadores: ["James Rodríguez", "Luis Díaz", "Jhon Durán", "Davinson Sánchez", "Richard Ríos"] },

  // Grupo L
  { id: "eng", nome: "Inglaterra", grupo: "L", bandeiraEmoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", tecnico: "Thomas Tuchel", jogadores: ["Harry Kane", "Jude Bellingham", "Bukayo Saka", "Phil Foden", "Declan Rice"] },
  { id: "cro", nome: "Croácia", grupo: "L", bandeiraEmoji: "🇭🇷", tecnico: "Zlatko Dalić", jogadores: ["Luka Modrić", "Mateo Kovačić", "Andrej Kramarić", "Joško Gvardiol", "Mario Pašalić"] },
  { id: "gha", nome: "Gana", grupo: "L", bandeiraEmoji: "🇬🇭", tecnico: "Otto Addo", jogadores: ["Mohammed Kudus", "Thomas Partey", "Iñaki Williams", "Jordan Ayew", "Antoine Semenyo"] },
  { id: "pan", nome: "Panamá", grupo: "L", bandeiraEmoji: "🇵🇦", tecnico: "Thomas Christiansen", jogadores: ["Aníbal Godoy", "Adalberto Carrasquilla", "José Fajardo", "Michael Murillo", "Cecilio Waterman"] },
];

// Estádios oficiais por cidade-sede.
const estadios: Record<string, string> = {
  "Cidade do México": "Estadio Azteca",
  "Guadalajara": "Estadio Akron",
  "Monterrey": "Estadio BBVA",
  "Toronto": "BMO Field",
  "Vancouver": "BC Place",
  "Los Angeles": "SoFi Stadium",
  "Nova York/Nova Jersey": "MetLife Stadium",
  "Boston": "Gillette Stadium",
  "Filadélfia": "Lincoln Financial Field",
  "Miami": "Hard Rock Stadium",
  "Atlanta": "Mercedes-Benz Stadium",
  "Houston": "NRG Stadium",
  "Dallas": "AT&T Stadium",
  "Kansas City": "Arrowhead Stadium",
  "Seattle": "Lumen Field",
  "Santa Clara": "Levi's Stadium",
};

// Todos os horários em horário de Brasília.
type J = Omit<Jogo, "id" | "estadio"> & { cidade: keyof typeof estadios };

const matches: J[] = [
  // ===== 1ª RODADA =====
  { rodada: 1, grupo: "A", data: "2026-06-11", hora: "16:00", cidade: "Cidade do México", selecaoA: "mex", selecaoB: "rsa" },
  { rodada: 1, grupo: "A", data: "2026-06-11", hora: "23:00", cidade: "Guadalajara", selecaoA: "kor", selecaoB: "cze" },
  { rodada: 1, grupo: "B", data: "2026-06-12", hora: "16:00", cidade: "Toronto", selecaoA: "can", selecaoB: "bih" },
  { rodada: 1, grupo: "D", data: "2026-06-12", hora: "22:00", cidade: "Los Angeles", selecaoA: "usa", selecaoB: "par" },
  { rodada: 1, grupo: "B", data: "2026-06-13", hora: "16:00", cidade: "Santa Clara", selecaoA: "qat", selecaoB: "sui" },
  { rodada: 1, grupo: "C", data: "2026-06-13", hora: "19:00", cidade: "Nova York/Nova Jersey", selecaoA: "bra", selecaoB: "mar" },
  { rodada: 1, grupo: "C", data: "2026-06-13", hora: "22:00", cidade: "Boston", selecaoA: "hai", selecaoB: "sco" },
  { rodada: 1, grupo: "D", data: "2026-06-14", hora: "01:00", cidade: "Vancouver", selecaoA: "aus", selecaoB: "tur" },
  { rodada: 1, grupo: "E", data: "2026-06-14", hora: "14:00", cidade: "Houston", selecaoA: "ger", selecaoB: "cur" },
  { rodada: 1, grupo: "F", data: "2026-06-14", hora: "17:00", cidade: "Dallas", selecaoA: "ned", selecaoB: "jpn" },
  { rodada: 1, grupo: "E", data: "2026-06-14", hora: "20:00", cidade: "Filadélfia", selecaoA: "civ", selecaoB: "ecu" },
  { rodada: 1, grupo: "F", data: "2026-06-14", hora: "23:00", cidade: "Monterrey", selecaoA: "swe", selecaoB: "tun" },
  { rodada: 1, grupo: "H", data: "2026-06-15", hora: "13:00", cidade: "Atlanta", selecaoA: "esp", selecaoB: "cpv" },
  { rodada: 1, grupo: "G", data: "2026-06-15", hora: "16:00", cidade: "Seattle", selecaoA: "bel", selecaoB: "egy" },
  { rodada: 1, grupo: "H", data: "2026-06-15", hora: "19:00", cidade: "Miami", selecaoA: "ksa", selecaoB: "uru" },
  { rodada: 1, grupo: "G", data: "2026-06-15", hora: "22:00", cidade: "Los Angeles", selecaoA: "irn", selecaoB: "nzl" },
  { rodada: 1, grupo: "I", data: "2026-06-16", hora: "16:00", cidade: "Nova York/Nova Jersey", selecaoA: "fra", selecaoB: "sen" },
  { rodada: 1, grupo: "I", data: "2026-06-16", hora: "19:00", cidade: "Boston", selecaoA: "irq", selecaoB: "nor" },
  { rodada: 1, grupo: "J", data: "2026-06-16", hora: "22:00", cidade: "Kansas City", selecaoA: "arg", selecaoB: "alg" },
  { rodada: 1, grupo: "J", data: "2026-06-17", hora: "01:00", cidade: "Santa Clara", selecaoA: "aut", selecaoB: "jor" },
  { rodada: 1, grupo: "K", data: "2026-06-17", hora: "14:00", cidade: "Houston", selecaoA: "por", selecaoB: "cod" },
  { rodada: 1, grupo: "L", data: "2026-06-17", hora: "17:00", cidade: "Dallas", selecaoA: "eng", selecaoB: "cro" },
  { rodada: 1, grupo: "L", data: "2026-06-17", hora: "20:00", cidade: "Toronto", selecaoA: "gha", selecaoB: "pan" },
  { rodada: 1, grupo: "K", data: "2026-06-17", hora: "23:00", cidade: "Cidade do México", selecaoA: "uzb", selecaoB: "col" },

  // ===== 2ª RODADA =====
  { rodada: 2, grupo: "A", data: "2026-06-18", hora: "13:00", cidade: "Atlanta", selecaoA: "cze", selecaoB: "rsa" },
  { rodada: 2, grupo: "B", data: "2026-06-18", hora: "16:00", cidade: "Los Angeles", selecaoA: "sui", selecaoB: "bih" },
  { rodada: 2, grupo: "B", data: "2026-06-18", hora: "19:00", cidade: "Vancouver", selecaoA: "can", selecaoB: "qat" },
  { rodada: 2, grupo: "A", data: "2026-06-18", hora: "22:00", cidade: "Guadalajara", selecaoA: "mex", selecaoB: "kor" },
  { rodada: 2, grupo: "D", data: "2026-06-19", hora: "16:00", cidade: "Seattle", selecaoA: "usa", selecaoB: "aus" },
  { rodada: 2, grupo: "C", data: "2026-06-19", hora: "19:00", cidade: "Boston", selecaoA: "sco", selecaoB: "mar" },
  { rodada: 2, grupo: "C", data: "2026-06-19", hora: "21:30", cidade: "Filadélfia", selecaoA: "bra", selecaoB: "hai" },
  { rodada: 2, grupo: "D", data: "2026-06-20", hora: "00:00", cidade: "Santa Clara", selecaoA: "tur", selecaoB: "par" },
  { rodada: 2, grupo: "F", data: "2026-06-20", hora: "14:00", cidade: "Houston", selecaoA: "ned", selecaoB: "swe" },
  { rodada: 2, grupo: "E", data: "2026-06-20", hora: "17:00", cidade: "Toronto", selecaoA: "ger", selecaoB: "civ" },
  { rodada: 2, grupo: "E", data: "2026-06-20", hora: "21:00", cidade: "Kansas City", selecaoA: "ecu", selecaoB: "cur" },
  { rodada: 2, grupo: "F", data: "2026-06-20", hora: "23:00", cidade: "Monterrey", selecaoA: "tun", selecaoB: "jpn" },
  { rodada: 2, grupo: "H", data: "2026-06-21", hora: "13:00", cidade: "Atlanta", selecaoA: "esp", selecaoB: "ksa" },
  { rodada: 2, grupo: "G", data: "2026-06-21", hora: "16:00", cidade: "Los Angeles", selecaoA: "bel", selecaoB: "irn" },
  { rodada: 2, grupo: "H", data: "2026-06-21", hora: "19:00", cidade: "Miami", selecaoA: "uru", selecaoB: "cpv" },
  { rodada: 2, grupo: "G", data: "2026-06-21", hora: "22:00", cidade: "Vancouver", selecaoA: "nzl", selecaoB: "egy" },
  { rodada: 2, grupo: "J", data: "2026-06-22", hora: "14:00", cidade: "Dallas", selecaoA: "arg", selecaoB: "aut" },
  { rodada: 2, grupo: "I", data: "2026-06-22", hora: "18:00", cidade: "Filadélfia", selecaoA: "fra", selecaoB: "irq" },
  { rodada: 2, grupo: "I", data: "2026-06-22", hora: "21:00", cidade: "Nova York/Nova Jersey", selecaoA: "nor", selecaoB: "sen" },
  { rodada: 2, grupo: "J", data: "2026-06-23", hora: "00:00", cidade: "Santa Clara", selecaoA: "jor", selecaoB: "alg" },
  { rodada: 2, grupo: "K", data: "2026-06-23", hora: "14:00", cidade: "Houston", selecaoA: "por", selecaoB: "uzb" },
  { rodada: 2, grupo: "L", data: "2026-06-23", hora: "17:00", cidade: "Boston", selecaoA: "eng", selecaoB: "gha" },
  { rodada: 2, grupo: "L", data: "2026-06-23", hora: "20:00", cidade: "Toronto", selecaoA: "pan", selecaoB: "cro" },
  { rodada: 2, grupo: "K", data: "2026-06-23", hora: "23:00", cidade: "Guadalajara", selecaoA: "col", selecaoB: "cod" },

  // ===== 3ª RODADA =====
  { rodada: 3, grupo: "B", data: "2026-06-24", hora: "16:00", cidade: "Vancouver", selecaoA: "sui", selecaoB: "can" },
  { rodada: 3, grupo: "B", data: "2026-06-24", hora: "16:00", cidade: "Seattle", selecaoA: "bih", selecaoB: "qat" },
  { rodada: 3, grupo: "C", data: "2026-06-24", hora: "19:00", cidade: "Miami", selecaoA: "sco", selecaoB: "bra" },
  { rodada: 3, grupo: "C", data: "2026-06-24", hora: "19:00", cidade: "Atlanta", selecaoA: "mar", selecaoB: "hai" },
  { rodada: 3, grupo: "A", data: "2026-06-24", hora: "22:00", cidade: "Cidade do México", selecaoA: "cze", selecaoB: "mex" },
  { rodada: 3, grupo: "A", data: "2026-06-24", hora: "22:00", cidade: "Monterrey", selecaoA: "rsa", selecaoB: "kor" },
  { rodada: 3, grupo: "E", data: "2026-06-25", hora: "17:00", cidade: "Nova York/Nova Jersey", selecaoA: "ecu", selecaoB: "ger" },
  { rodada: 3, grupo: "E", data: "2026-06-25", hora: "17:00", cidade: "Filadélfia", selecaoA: "cur", selecaoB: "civ" },
  { rodada: 3, grupo: "F", data: "2026-06-25", hora: "20:00", cidade: "Dallas", selecaoA: "jpn", selecaoB: "swe" },
  { rodada: 3, grupo: "F", data: "2026-06-25", hora: "20:00", cidade: "Kansas City", selecaoA: "tun", selecaoB: "ned" },
  { rodada: 3, grupo: "D", data: "2026-06-25", hora: "23:00", cidade: "Los Angeles", selecaoA: "tur", selecaoB: "usa" },
  { rodada: 3, grupo: "D", data: "2026-06-25", hora: "23:00", cidade: "Santa Clara", selecaoA: "par", selecaoB: "aus" },
  { rodada: 3, grupo: "I", data: "2026-06-26", hora: "16:00", cidade: "Boston", selecaoA: "nor", selecaoB: "fra" },
  { rodada: 3, grupo: "I", data: "2026-06-26", hora: "16:00", cidade: "Toronto", selecaoA: "sen", selecaoB: "irq" },
  { rodada: 3, grupo: "H", data: "2026-06-26", hora: "21:00", cidade: "Houston", selecaoA: "cpv", selecaoB: "ksa" },
  { rodada: 3, grupo: "H", data: "2026-06-26", hora: "21:00", cidade: "Guadalajara", selecaoA: "uru", selecaoB: "esp" },
  { rodada: 3, grupo: "G", data: "2026-06-27", hora: "00:00", cidade: "Seattle", selecaoA: "egy", selecaoB: "irn" },
  { rodada: 3, grupo: "G", data: "2026-06-27", hora: "00:00", cidade: "Vancouver", selecaoA: "nzl", selecaoB: "bel" },
  { rodada: 3, grupo: "L", data: "2026-06-27", hora: "18:00", cidade: "Nova York/Nova Jersey", selecaoA: "pan", selecaoB: "eng" },
  { rodada: 3, grupo: "L", data: "2026-06-27", hora: "18:00", cidade: "Filadélfia", selecaoA: "cro", selecaoB: "gha" },
  { rodada: 3, grupo: "K", data: "2026-06-27", hora: "20:30", cidade: "Miami", selecaoA: "col", selecaoB: "por" },
  { rodada: 3, grupo: "K", data: "2026-06-27", hora: "20:30", cidade: "Atlanta", selecaoA: "cod", selecaoB: "uzb" },
  { rodada: 3, grupo: "J", data: "2026-06-27", hora: "23:00", cidade: "Kansas City", selecaoA: "alg", selecaoB: "aut" },
  { rodada: 3, grupo: "J", data: "2026-06-27", hora: "23:00", cidade: "Dallas", selecaoA: "jor", selecaoB: "arg" },
];

export const jogos: Jogo[] = matches.map((m, i) => ({
  id: `R${m.rodada}-${String(i + 1).padStart(2, "0")}-${m.grupo}`,
  rodada: m.rodada,
  grupo: m.grupo,
  data: m.data,
  hora: m.hora,
  estadio: estadios[m.cidade],
  cidade: m.cidade,
  selecaoA: m.selecaoA,
  selecaoB: m.selecaoB,
}));

export const grupos = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export function getSelecao(id: string): Selecao | undefined {
  return selecoes.find((s) => s.id === id);
}
