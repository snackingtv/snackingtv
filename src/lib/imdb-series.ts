export type ImdbSeries = {
  id: number;
  title: string;
  imageUrl: string;
  imdbUrl: string;
};

export const imdbTop10Series: ImdbSeries[] = [
  {
    id: 1,
    title: "Breaking Bad",
    imageUrl: "https://picsum.photos/seed/breakingbad/270/400",
    imdbUrl: "https://www.imdb.com/title/tt0903747/",
  },
  {
    id: 2,
    title: "Planet Earth II",
    imageUrl: "https://picsum.photos/seed/planetearth2/270/400",
    imdbUrl: "https://www.imdb.com/title/tt5491994/",
  },
  {
    id: 3,
    title: "Planet Earth",
    imageUrl: "https://picsum.photos/seed/planetearth/270/400",
    imdbUrl: "https://www.imdb.com/title/tt0795176/",
  },
  {
    id: 4,
    title: "Band of Brothers",
    imageUrl: "https://picsum.photos/seed/bandofbrothers/270/400",
    imdbUrl: "https://www.imdb.com/title/tt0185906/",
  },
  {
    id: 5,
    title: "Chernobyl",
    imageUrl: "https://picsum.photos/seed/chernobyl/270/400",
    imdbUrl: "https://www.imdb.com/title/tt7366338/",
  },
  {
    id: 6,
    title: "The Wire",
    imageUrl: "https://picsum.photos/seed/thewire/270/400",
    imdbUrl: "https://www.imdb.com/title/tt0306414/",
  },
  {
    id: 7,
    title: "Avatar: The Last Airbender",
    imageUrl: "https://picsum.photos/seed/avatar/270/400",
    imdbUrl: "https://www.imdb.com/title/tt0417299/",
  },
  {
    id: 8,
    title: "Blue Planet II",
    imageUrl: "https://picsum.photos/seed/blueplanet2/270/400",
    imdbUrl: "https://www.imdb.com/title/tt6769208/",
  },
  {
    id: 9,
    title: "The Sopranos",
    imageUrl: "https://picsum.photos/seed/sopranos/270/400",
    imdbUrl: "https://www.imdb.com/title/tt0141842/",
  },
  {
    id: 10,
    title: "Cosmos: A Spacetime Odyssey",
    imageUrl: "https://picsum.photos/seed/cosmos/270/400",
    imdbUrl: "https://www.imdb.com/title/tt2395695/",
  },
];
