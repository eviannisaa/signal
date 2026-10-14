import type { LessonSeed } from './types'

/**
 * Materi lesson. Slug bersifat tetap karena dirujuk oleh quiz dan link lama.
 * Tabel karakter dibuat dari lib/morse.ts, sehingga di sini cukup daftar karakternya.
 */
export const lessonsSeed: LessonSeed[] = [
  {
    slug: 'dasar-morse',
    title: 'Dasar Sandi Morse',
    titleEn: 'Morse Code Basics',
    position: 1,
    characters: ['E', 'T', 'I', 'A', 'N', 'M'],
    description: [
      'Sandi Morse menyusun setiap huruf dari dua sinyal saja: titik (dot) yang pendek dan strip (dash) yang panjang. Sinyal ini dapat dikirim sebagai bunyi, kedipan lampu, atau ketukan, sehingga Morse masih dipakai oleh operator radio amatir, pelaut, dan pramuka hingga sekarang.',
      'Lesson pertama memperkenalkan enam huruf dengan kode paling pendek. E adalah satu titik dan T adalah satu strip. Keduanya merupakan huruf yang paling sering muncul dalam bahasa Inggris, sehingga sengaja diberi kode tersingkat.',
      'Empat huruf berikutnya tersusun dari dua sinyal. I adalah dua titik dan M adalah dua strip. A adalah titik lalu strip, sedangkan N adalah kebalikannya, yaitu strip lalu titik. Pasangan A dan N mudah diingat karena saling mencerminkan.',
      'Ukuran waktunya selalu relatif. Satu titik berlangsung satu satuan waktu (unit), sedangkan satu strip berlangsung tiga unit. Jeda di antara sinyal dalam satu huruf adalah satu unit.',
      'Tips: jangan menghafal gambar titik dan strip. Ucapkan bunyinya, misalnya "dit" untuk titik dan "dah" untuk strip, sehingga A terdengar "di-dah" dan N terdengar "dah-dit". Putar Audio Signal pada setiap huruf dan tirukan iramanya.',
    ].join('\n\n'),
    descriptionEn: [
      'Morse code builds every letter from just two signals: a short dot and a long dash. These signals can be sent as sound, flashes of light, or taps, which is why Morse is still used by amateur radio operators, sailors, and scouts today.',
      'The first lesson introduces the six letters with the shortest codes. E is a single dot and T is a single dash. They are the two most common letters in English, so they were deliberately given the shortest codes.',
      'The next four letters are made of two signals. I is two dots and M is two dashes. A is a dot followed by a dash, while N is the reverse: a dash followed by a dot. A and N are easy to remember because they mirror each other.',
      'Timing is always relative. A dot lasts one unit of time, and a dash lasts three units. The gap between signals within a letter is one unit.',
      'Tip: don\'t memorize how the dots and dashes look. Say them out loud instead, using "dit" for a dot and "dah" for a dash, so A sounds like "di-dah" and N sounds like "dah-dit". Play the Audio Signal for each letter and copy its rhythm.',
    ].join('\n\n'),
  },
  {
    slug: 'huruf-pendek',
    title: 'Huruf Pendek',
    titleEn: 'Short Letters',
    position: 2,
    characters: ['S', 'O', 'H', 'U', 'R', 'D', 'W', 'K', 'G'],
    description: [
      'Lesson ini menambahkan sembilan huruf yang tersusun dari tiga atau empat sinyal. Dengan menguasai huruf-huruf ini, Anda sudah dapat membaca banyak kata pendek.',
      'Pasangan paling terkenal adalah S (tiga titik) dan O (tiga strip). Gabungan keduanya membentuk SOS, yaitu ··· ——— ···, sinyal darurat internasional yang mudah dikenali karena iramanya simetris. H adalah empat titik, satu titik lebih banyak daripada S.',
      'Banyak huruf dapat diingat sebagai pasangan kebalikan. U (titik titik strip) berpasangan dengan D (strip titik titik). R (titik strip titik) berpasangan dengan K (strip titik strip). W (titik strip strip) berpasangan dengan G (strip strip titik).',
      'Perhatikan juga hubungannya dengan huruf dari lesson pertama. U adalah I ditambah satu strip, R adalah A ditambah satu titik, dan W adalah A ditambah satu strip. Pola ini membantu menebak kode huruf baru dari huruf yang sudah dikenal.',
      'Tips: latih pasangan kebalikan secara bergantian, misalnya U lalu D, kemudian R lalu K. Telinga akan terbiasa membedakan sinyal yang diawali titik dan sinyal yang diawali strip.',
    ].join('\n\n'),
    descriptionEn: [
      'This lesson adds nine letters made of three or four signals. Once you know them, you can already read many short words.',
      'The best-known pair is S (three dots) and O (three dashes). Together they form SOS, ··· ——— ···, the international distress signal, which is easy to recognize because its rhythm is symmetrical. H is four dots, one more dot than S.',
      'Many letters can be remembered as reverse pairs. U (dot dot dash) pairs with D (dash dot dot). R (dot dash dot) pairs with K (dash dot dash). W (dot dash dash) pairs with G (dash dash dot).',
      'Notice how they relate to the letters from the first lesson, too. U is I plus a dash, R is A plus a dot, and W is A plus a dash. This pattern helps you work out the code for a new letter from letters you already know.',
      'Tip: practice the reverse pairs back to back, for example U then D, then R then K. Your ear will get used to telling apart signals that start with a dot from signals that start with a dash.',
    ].join('\n\n'),
  },
  {
    slug: 'huruf-panjang',
    title: 'Huruf Panjang',
    titleEn: 'Long Letters',
    position: 3,
    characters: ['B', 'C', 'F', 'J', 'L', 'P', 'Q', 'V', 'X', 'Y', 'Z'],
    description: [
      'Lesson ini melengkapi alfabet A–Z dengan sebelas huruf yang masing-masing tersusun dari empat sinyal. Karena lebih panjang, huruf-huruf ini lebih jarang dipakai dan perlu didengarkan dengan lebih teliti.',
      'Beberapa huruf membentuk pasangan kebalikan. B (strip titik titik titik) berpasangan dengan V (titik titik titik strip). F (titik titik strip titik) berpasangan dengan L (titik strip titik titik). Y (strip titik strip strip) berpasangan dengan Q (strip strip titik strip).',
      'Huruf lainnya dapat diingat dari pola khasnya. C (strip titik strip titik) terdengar seperti irama "dah-di-dah-dit" yang berulang. J (titik strip strip strip) diawali satu titik lalu tiga strip, sedangkan P (titik strip strip titik) diapit titik di kedua ujungnya. X (strip titik titik strip) diapit strip, dan Z (strip strip titik titik) diawali dua strip lalu dua titik.',
      'V juga mudah diingat karena iramanya "di-di-di-dah" mirip pembuka simfoni kelima Beethoven. Bandingkan pula B dengan D: keduanya diawali strip, tetapi B memiliki satu titik lebih banyak.',
      'Tips: buka Morse Chart pada setiap huruf. Pohon Morse menunjukkan bahwa setiap titik berarti belok ke kiri dan setiap strip berarti belok ke kanan, sehingga huruf empat sinyal berada di baris paling bawah.',
    ].join('\n\n'),
    descriptionEn: [
      'This lesson completes the A–Z alphabet with eleven letters, each made of four signals. Because they are longer, these letters are used less often and need to be listened to more carefully.',
      'Several letters form reverse pairs. B (dash dot dot dot) pairs with V (dot dot dot dash). F (dot dot dash dot) pairs with L (dot dash dot dot). Y (dash dot dash dash) pairs with Q (dash dash dot dash).',
      'The other letters can be remembered by their distinctive patterns. C (dash dot dash dot) sounds like a repeating "dah-di-dah-dit" rhythm. J (dot dash dash dash) starts with one dot followed by three dashes, while P (dot dash dash dot) has a dot at each end. X (dash dot dot dash) has a dash at each end, and Z (dash dash dot dot) starts with two dashes followed by two dots.',
      'V is also easy to remember because its "di-di-di-dah" rhythm sounds like the opening of Beethoven\'s Fifth Symphony. Compare B with D as well: both start with a dash, but B has one more dot.',
      'Tip: open the Morse Chart for each letter. The Morse tree shows that every dot means turning left and every dash means turning right, so the four-signal letters sit on the bottom row.',
    ].join('\n\n'),
  },
  {
    slug: 'angka',
    title: 'Angka',
    titleEn: 'Numbers',
    position: 4,
    characters: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    description: [
      'Semua angka dalam sandi Morse tersusun dari tepat lima sinyal. Panjang yang seragam ini membuat angka mudah dibedakan dari huruf, yang paling banyak terdiri atas empat sinyal.',
      'Angka 1 sampai 5 diawali titik. Angka 1 adalah satu titik diikuti empat strip, angka 2 adalah dua titik diikuti tiga strip, dan seterusnya hingga angka 5 yang terdiri atas lima titik. Jumlah titik di awal sama dengan angkanya.',
      'Angka 6 sampai 9 diawali strip. Angka 6 adalah satu strip diikuti empat titik, angka 7 adalah dua strip diikuti tiga titik, dan seterusnya hingga angka 9 yang terdiri atas empat strip lalu satu titik. Angka 0 adalah lima strip.',
      'Cara cepat untuk angka 6 sampai 9: jumlah strip di awal sama dengan angka dikurangi lima. Misalnya, angka 8 diawali tiga strip karena 8 − 5 = 3.',
      'Tips: bayangkan titik "bergeser" dari kiri ke kanan. Dari 1 ke 5 titik bertambah dari kiri, lalu dari 6 ke 0 strip bertambah dari kiri hingga semuanya menjadi strip.',
    ].join('\n\n'),
    descriptionEn: [
      'Every number in Morse code is made of exactly five signals. This uniform length makes numbers easy to tell apart from letters, which have at most four signals.',
      'The numbers 1 to 5 start with a dot. 1 is one dot followed by four dashes, 2 is two dots followed by three dashes, and so on up to 5, which is five dots. The number of leading dots equals the number itself.',
      'The numbers 6 to 9 start with a dash. 6 is one dash followed by four dots, 7 is two dashes followed by three dots, and so on up to 9, which is four dashes followed by one dot. 0 is five dashes.',
      'A shortcut for 6 to 9: the number of leading dashes equals the number minus five. For example, 8 starts with three dashes because 8 − 5 = 3.',
      'Tip: picture the dots "shifting" from left to right. From 1 to 5 the dots grow from the left, then from 6 to 0 the dashes grow from the left until everything is a dash.',
    ].join('\n\n'),
  },
  {
    slug: 'jeda-dan-kata',
    title: 'Jeda dan Kata',
    titleEn: 'Spacing and Words',
    position: 5,
    characters: ['.', ',', '?', '/'],
    description: [
      'Lesson terakhir membahas cara menyusun huruf menjadi kata dan kalimat. Kuncinya ada pada jeda, karena tanpa jeda yang tepat, deretan titik dan strip tidak dapat dipisahkan menjadi huruf.',
      'Seluruh timing Morse diukur dalam unit. Titik berlangsung 1 unit dan strip 3 unit. Jeda di antara sinyal dalam satu huruf adalah 1 unit, jeda di antara huruf adalah 3 unit, dan jeda di antara kata adalah 7 unit. Urutan 1-3-7 ini berlaku pada kecepatan berapa pun.',
      'Kecepatan Morse dinyatakan dalam WPM (words per minute). Pada 12 WPM, satu unit berlangsung sekitar 100 milidetik. Semakin tinggi WPM, semakin pendek setiap unit, tetapi perbandingan 1-3-7 tetap sama.',
      'Lesson ini juga memperkenalkan empat tanda baca yang sering dipakai. Titik (.) adalah "titik strip" yang diulang tiga kali. Koma (,) adalah dua strip, dua titik, lalu dua strip. Tanda tanya (?) adalah dua titik, dua strip, lalu dua titik. Garis miring (/) adalah strip titik titik strip titik. Saat menulis Morse sebagai teks, garis miring juga lazim dipakai untuk menandai jeda antarkata.',
      'Tips: buka tab Signal Timeline untuk melihat panjang setiap sinyal dan jeda dalam kotak unit. Saat berlatih menulis, beri satu spasi di antara huruf dan tanda / di antara kata, misalnya ··· ——— ··· / ···.',
    ].join('\n\n'),
    descriptionEn: [
      'The final lesson covers how to put letters together into words and sentences. The key is spacing: without the right gaps, a string of dots and dashes cannot be split into letters.',
      'All Morse timing is measured in units. A dot lasts 1 unit and a dash lasts 3 units. The gap between signals within a letter is 1 unit, the gap between letters is 3 units, and the gap between words is 7 units. This 1-3-7 pattern holds at any speed.',
      'Morse speed is measured in WPM (words per minute). At 12 WPM, one unit lasts about 100 milliseconds. The higher the WPM, the shorter each unit, but the 1-3-7 ratio stays the same.',
      'This lesson also introduces four common punctuation marks. The period (.) is "dot dash" repeated three times. The comma (,) is two dashes, two dots, then two dashes. The question mark (?) is two dots, two dashes, then two dots. The slash (/) is dash dot dot dash dot. When writing Morse as text, the slash is also commonly used to mark the gap between words.',
      'Tip: open the Signal Timeline tab to see the length of every signal and gap as unit blocks. When practicing writing, put one space between letters and a / between words, for example ··· ——— ··· / ···.',
    ].join('\n\n'),
  },
]
