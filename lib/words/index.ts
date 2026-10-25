export interface WordPack {
  id: string;
  name: string;
  words: readonly string[];
}

function pack(id: string, name: string, list: string): WordPack {
  const words = Array.from(new Set(list.split(/\s*,\s*/).map((w) => w.trim().toUpperCase()).filter(Boolean)));
  return { id, name, words };
}

export const PACKS: readonly WordPack[] = [
  pack(
    "everyday",
    "Everyday",
    `apple, bridge, candle, mirror, pillow, umbrella, ladder, wallet, blanket, bucket, garden, window, kettle, pencil,
    rocket, island, jungle, desert, castle, ticket, bottle, button, carpet, chimney, circus, cloud, compass, crown,
    diamond, dragon, engine, feather, forest, ghost, glove, guitar, hammer, helmet, honey, iceberg, jacket, kite,
    lemon, magnet, map, market, medal, monkey, moon, needle, ocean, onion, orange, painter, parrot, peanut, piano,
    pirate, planet, pocket, potato, puzzle, rabbit, rainbow, river, robot, saddle, sandwich, scarf, school, shadow,
    shark, shoe, signal, silver, skeleton, snake, snow, sock, spider, spoon, stamp, star, storm, sugar, sun, sword,
    table, tiger, tooth, tower, train, treasure, tunnel, turtle, valley, violin, volcano, wagon, whistle, wind,
    wizard, wolf, zebra, alarm, anchor, balloon, bandage, battery, beard, bench, bicycle, bird, blade, bone, brush,
    cactus, camera, captain, chain, cheese, chess, clock, coin, cookie, cotton, cushion, dentist, dice, doctor,
    door, drum, eagle, earth, elephant, envelope, fence, fire, flag, flute, fork, fountain, frog, garage, glass,
    goat, gold, hat, heart, hospital, hotel, jewel, key, king, knife, lamp, letter, library, lion, lock, mask,
    milk, mountain, mouse, museum, nest, net, nurse, owl, paint, paper, parachute, party, pen, penguin, pepper,
    phone, picnic, pig, pilot, pipe, pizza, police, prince, pumpkin, queen, radio, rain, ring, roof, rope, salt,
    sand, scissors, ship, shirt, singer, sky, soap, soldier, square, stone, sweater, tail, teacher, tent, thunder,
    tiles, toast, tomato, torch, tractor, tree, trophy, truck, vase, wall, watch, water, whale, wheel, wing, yoga`,
  ),
  pack(
    "bollywood",
    "Bollywood",
    `sholay, lagaan, dangal, pk, devdas, kabir singh, andaz apna apna, hera pheri, golmaal, dilwale, don, krrish,
    dhoom, gully boy, queen, barfi, swades, rang de basanti, munna bhai, zindagi na milegi dobara, kal ho naa ho,
    taare zameen par, chak de india, bajrangi bhaijaan, baahubali, rrr, pathaan, jawan, stree, andhadhun, tumbbad,
    piku, kahaani, paheli, mohabbatein, kuch kuch hota hai, dil chahta hai, jab we met, rockstar, wake up sid,
    yeh jawaani hai deewani, chennai express, om shanti om, main hoon na, kabhi khushi kabhie gham, veer zaara,
    gangs of wasseypur, drishyam, uri, shershaah, padmaavat, bajirao mastani, raazi, article 15, badhaai ho,
    bala, dream girl, housefull, welcome, singham, simmba, sooryavanshi, war, tiger, ek tha tiger, sultan,
    tubelight, kick, dabangg, wanted, ready, bodyguard, gadar, border, lakshya, guru, roja, dil se, bombay,
    taal, rangeela, satya, company, sarkar, black, lootera, highway, tamasha, rockstar, item song, interval,
    villain, hero entry, slow motion, rain song, mother's blessing, climax, sequel, flashback, filmfare,
    box office, playback singer, dance-off, superstar, director, producer, choreographer, stuntman, dialogue,
    remake, sequel, double role, lost and found, wedding song, intermission, paparazzi, red carpet`,
  ),
  pack(
    "food",
    "Food",
    `biryani, samosa, dosa, idli, vada pav, pav bhaji, chole bhature, paneer, butter chicken, naan, roti, paratha,
    pani puri, bhel, dhokla, jalebi, gulab jamun, rasgulla, kheer, halwa, lassi, chai, filter coffee, momos, maggi,
    khichdi, rajma, dal, sambar, rasam, upma, poha, pulao, kebab, tikka, korma, vindaloo, appam, puttu, pongal,
    thepla, khakhra, kachori, pakora, chutney, pickle, papad, raita, curd, ghee, jaggery, cardamom, saffron,
    turmeric, cumin, mango, banana, coconut, jackfruit, guava, papaya, watermelon, grapes, pineapple, lychee,
    pomegranate, orange, lemon, ginger, garlic, onion, tomato, potato, cauliflower, brinjal, okra, spinach,
    pumpkin, corn, peanut, cashew, almond, pizza, burger, pasta, noodles, sushi, taco, sandwich, croissant,
    pancake, waffle, doughnut, brownie, cheesecake, ice cream, popcorn, chips, chocolate, cupcake, cookie,
    toast, omelette, cereal, porridge, salad, soup, steak, fries, ketchup, mayonnaise, mustard, cheese,
    butter, honey, jam, bread, bagel, pretzel, milkshake, smoothie, lemonade, sugarcane juice, kulfi, falooda,
    barfi, ladoo, modak, peda, sandesh, chikki, gajak, rabri, shrikhand, mishti doi`,
  ),
  pack(
    "hard",
    "Hard",
    `democracy, gravity, nostalgia, karma, irony, echo, silhouette, paradox, deadline, hangover, jet lag, alibi,
    mirage, eclipse, vaccine, algorithm, password, firewall, inflation, monsoon, avalanche, satire, rumour,
    jealousy, loyalty, ambition, patience, courage, freedom, secret, promise, mystery, legend, myth, ritual,
    prophecy, destiny, coincidence, gossip, sarcasm, ego, stubborn, awkward, dizzy, fragile, invisible, ancient,
    hollow, frozen, electric, magnetic, gigantic, tiny, ordinary, curious, brave, lazy, greedy, honest, clumsy,
    nervous, generous, thrifty, loud, silent, bitter, sweet, sour, spicy, bland, sticky, slippery, rough, smooth,
    blurry, crisp, ripple, orbit, galaxy, telescope, microscope, fossil, glacier, horizon, tide, compass,
    passport, customs, embassy, election, parliament, verdict, witness, ransom, heist, spy, double agent,
    bluff, jackpot, lottery, bankrupt, mortgage, refund, tax, interest, startup, unicorn, pitch, merger,
    resume, interview, promotion, retirement, hobby, habit, routine, tradition, festival, pilgrimage, karaoke,
    marathon, referee, penalty, umpire, sixer, googly, checkmate, stalemate, origami, graffiti, podcast,
    meme, selfie, hashtag, influencer, binge, spoiler, cliffhanger, plot twist, cameo, encore, standing ovation`,
  ),
];

export function getPack(id: string): WordPack {
  return PACKS.find((p) => p.id === id) ?? PACKS[0];
}
