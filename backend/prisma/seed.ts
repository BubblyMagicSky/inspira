import { PrismaClient, ItemType, Provider, InteractionType } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const user1 = await prisma.user.upsert({
    where: { email: 'user1@example.com' },
    update: {},
    create: {
      email: 'user1@example.com',
      username: 'user1',
      avatarUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'user2@example.com' },
    update: {},
    create: {
      email: 'user2@example.com',
      username: 'user2',
      avatarUrl: 'https://randomuser.me/api/portraits/women/1.jpg',
    },
  });

  console.log('Created users:', { user1, user2 });

  const items = await Promise.all([
    prisma.item.create({
      data: {
        title: 'Inception',
        type: ItemType.MOVIE,
        provider: Provider.TMDB,
        externalId: '27205',
        userId: user1.id,
        metadata: {
          genres: ['Science Fiction', 'Action', 'Adventure'],
          releaseDate: '2010-07-16',
          overview: 'A thief who steals corporate secrets through the use of dream-sharing technology.',
          voteAverage: 8.4,
          posterPath: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
        },
      },
    }),
    prisma.item.create({
      data: {
        title: 'The Shawshank Redemption',
        type: ItemType.MOVIE,
        provider: Provider.TMDB,
        externalId: '278',
        userId: user1.id,
        metadata: {
          genres: ['Drama', 'Crime'],
          releaseDate: '1994-09-23',
          overview: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
          voteAverage: 8.7,
          posterPath: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
        },
      },
    }),
    
    prisma.item.create({
      data: {
        title: 'Bohemian Rhapsody',
        type: ItemType.TRACK,
        provider: Provider.SPOTIFY,
        externalId: '3z8h0TU7ReDPLIbEnYhWZb',
        userId: user1.id,
        metadata: {
          artists: ['Queen'],
          album: 'A Night at the Opera',
          genres: ['Rock', 'Classic Rock'],
          releaseDate: '1975-10-31',
          durationMs: 354320,
          popularity: 82,
        },
      },
    }),
    prisma.item.create({
      data: {
        title: 'Billie Jean',
        type: ItemType.TRACK,
        provider: Provider.SPOTIFY,
        externalId: '5ChkMS8OtdzJeqyybCc9R5',
        userId: user2.id,
        metadata: {
          artists: ['Michael Jackson'],
          album: 'Thriller',
          genres: ['Pop', 'R&B'],
          releaseDate: '1982-11-30',
          durationMs: 293826,
          popularity: 79,
        },
      },
    }),
    
    prisma.item.create({
      data: {
        title: '1984',
        type: ItemType.BOOK,
        provider: Provider.TMDB,
        externalId: 'book_1984',
        userId: user2.id,
        metadata: {
          author: 'George Orwell',
          genres: ['Dystopian', 'Science Fiction', 'Political Fiction'],
          publishDate: '1949-06-08',
          pages: 328,
          description: 'A dystopian social science fiction novel that examines the consequences of totalitarianism.',
        },
      },
    }),
    
    prisma.item.create({
      data: {
        title: 'The Legend of Zelda: Breath of the Wild',
        type: ItemType.GAME,
        provider: Provider.TMDB,
        externalId: 'game_zelda_botw',
        userId: user1.id,
        metadata: {
          developer: 'Nintendo',
          genres: ['Action-Adventure', 'Open World'],
          releaseDate: '2017-03-03',
          platforms: ['Nintendo Switch', 'Wii U'],
          rating: 9.5,
        },
      },
    }),
    
    prisma.item.create({
      data: {
        title: 'Starry Night',
        type: ItemType.ART,
        provider: Provider.TMDB,
        externalId: 'art_starry_night',
        userId: user2.id,
        metadata: {
          artist: 'Vincent van Gogh',
          year: 1889,
          medium: 'Oil on canvas',
          genres: ['Post-Impressionism', 'Landscape'],
          location: 'Museum of Modern Art, New York',
        },
      },
    }),
  ]);

  console.log('Created items:', items);

  const interactions = await Promise.all([
    prisma.interaction.create({
      data: {
        type: InteractionType.LIKE,
        userId: user1.id,
        itemId: items[0].id,
      },
    }),
    prisma.interaction.create({
      data: {
        type: InteractionType.SAVE,
        userId: user1.id,
        itemId: items[1].id,
      },
    }),
    prisma.interaction.create({
      data: {
        type: InteractionType.SKIP,
        userId: user1.id,
        itemId: items[4].id,
      },
    }),
    prisma.interaction.create({
      data: {
        type: InteractionType.LIKE,
        userId: user2.id,
        itemId: items[2].id,
      },
    }),
    prisma.interaction.create({
      data: {
        type: InteractionType.SAVE,
        userId: user2.id,
        itemId: items[3].id,
      },
    }),
  ]);

  console.log('Created interactions:', interactions);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
