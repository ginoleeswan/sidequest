import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  ImageBackground,
  Keyboard,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { getGames, getMustPlayGames, searchGames } from '@/api/rawg';
import type { Game } from '@/api/types';
import { Chip } from '@/components/Chip';
import { DynamicIcon, type IconType } from '@/components/DynamicIcon';
import { GameCard } from '@/components/GameCard';
import { GameInfoCard } from '@/components/GameInfoCard';
import { SearchInput } from '@/components/SearchInput';
import { COLORS } from '@/styles/colors';
import { TYPE } from '@/styles/typography';

interface Category {
  id: number;
  title: string;
  fetch: () => Promise<{ results: Game[] }>;
  iconName: string;
  iconType: IconType;
}

const CATEGORIES: Category[] = [
  {
    id: 0,
    title: 'Trending',
    fetch: () => getGames(),
    iconName: 'trending-up',
    iconType: 'feather',
  },
  {
    id: 1,
    title: 'Must Play',
    fetch: getMustPlayGames,
    iconName: 'star',
    iconType: 'material-community',
  },
  {
    id: 2,
    title: 'Indie',
    fetch: () => getGames('indie'),
    iconName: 'heart',
    iconType: 'material-community',
  },
  {
    id: 3,
    title: 'Racing',
    fetch: () => getGames('racing'),
    iconName: 'car',
    iconType: 'font-awesome-5',
  },
  {
    id: 4,
    title: 'Strategy',
    fetch: () => getGames('strategy'),
    iconName: 'strategy',
    iconType: 'material-community',
  },
  {
    id: 5,
    title: 'Simulation',
    fetch: () => getGames('simulation'),
    iconName: 'person',
    iconType: 'ionicon',
  },
  {
    id: 6,
    title: 'Casual',
    fetch: () => getGames('casual'),
    iconName: 'checkerboard',
    iconType: 'material-community',
  },
  {
    id: 7,
    title: 'Sport',
    fetch: () => getGames('sports'),
    iconName: 'soccer',
    iconType: 'material-community',
  },
  {
    id: 8,
    title: 'Shooter',
    fetch: () => getGames('shooter'),
    iconName: 'crosshairs',
    iconType: 'font-awesome-5',
  },
  {
    id: 9,
    title: 'RPG',
    fetch: () => getGames('role-playing-games-rpg'),
    iconName: 'shield',
    iconType: 'material-community',
  },
  {
    id: 10,
    title: 'Adventure',
    fetch: () => getGames('adventure'),
    iconName: 'compass',
    iconType: 'material-community',
  },
];

const SEARCH_SECTION = {
  title: 'Search',
  iconName: 'search',
  iconType: 'material-icons' as IconType,
};

const CARD_WIDTH = 316; // wide card + margins

export default function HomeScreen() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedChip, setSelectedChip] = useState(0);
  const [section, setSection] = useState<typeof SEARCH_SECTION>(CATEGORIES[0]);
  const insets = useSafeAreaInsets();
  const scrollY = useAnimatedValue(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = scrollY.interpolate({
    inputRange: [0, 200 + insets.top],
    outputRange: [0, insets.top - 260],
    extrapolate: 'clamp',
  });
  const fadeOutOnScroll = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const load = useCallback(
    async (fetcher: () => Promise<{ results: Game[] }>) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetcher();
        setGames(data.results);
      } catch (e) {
        setGames([]);
        setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    },
    []
  );
  const selectCategory = useCallback(
    (category: Category) => {
      setQuery('');
      setSelectedChip(category.id);
      setSection(category);
      load(category.fetch);
    },
    [load]
  );
  const onSearchChange = (text: string) => {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      if (text.trim() === '') {
        selectCategory(CATEGORIES[selectedChip]);
      } else {
        setSection(SEARCH_SECTION);
        load(() => searchGames(text));
      }
    }, 400);
  };
  useEffect(() => {
    // Initial category load: intentionally kicked off synchronously on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(CATEGORIES[0].fetch);
  }, [load]);
  const searching = query.trim() !== '';
  return (
    <ImageBackground
      source={require('../../assets/images/noise.png')}
      resizeMode="repeat"
      style={styles.background}
    >
      <SafeAreaView style={styles.container} edges={['right', 'top', 'left']}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.appTitle}>ARCADE</Text>
            <SearchInput value={query} onChangeText={onSearchChange} />
          </View>
          <FlatList
            data={CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Chip
                title={item.title}
                selected={!searching && selectedChip === item.id}
                iconName={item.iconName}
                iconType={item.iconType}
                onPress={() => selectCategory(item)}
              />
            )}
            contentContainerStyle={styles.chips}
          />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.lightGrey} />
            <Text style={[TYPE.p, styles.loadingText]}>
              Loading {section.title} Games...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={TYPE.p}>{error}</Text>
          </View>
        ) : (
          <Animated.View style={!searching && { transform: [{ translateY }] }}>
            {!searching && (
              <Animated.View style={{ opacity: fadeOutOnScroll }}>
                <FlatList
                  data={games.slice(0, 4)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={CARD_WIDTH}
                  decelerationRate="fast"
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => <GameCard game={item} wide />}
                  contentContainerStyle={styles.carousel}
                />
              </Animated.View>
            )}

            <View style={styles.sectionRow}>
              <DynamicIcon
                type={section.iconType}
                name={section.iconName}
                color={COLORS.mediumGrey}
              />
              <Text style={[TYPE.h3, styles.sectionTitle]}>
                {section.title} Games
              </Text>
            </View>

            <FlatList
              data={searching ? games : games.slice(4)}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
              onScrollBeginDrag={() => Keyboard.dismiss()}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => <GameInfoCard game={item} />}
              contentContainerStyle={styles.list}
            />
          </Animated.View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: COLORS.darkGrey,
  },
  container: { flex: 1 },
  header: { zIndex: 10, paddingBottom: 15 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  appTitle: {
    fontFamily: 'Noah-Black',
    fontSize: 30,
    color: COLORS.lightGrey,
  },
  chips: {
    alignItems: 'center',
    paddingHorizontal: 5,
    height: 50,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: { top: 5 },
  carousel: {
    paddingHorizontal: (Dimensions.get('window').width - CARD_WIDTH) / 2,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  sectionTitle: { textAlign: 'right' },
  list: {
    flexGrow: 1,
    paddingBottom: 450,
    alignItems: 'center',
  },
});
