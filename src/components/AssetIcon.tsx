import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Banknote,
  Building2,
  Coins,
  DollarSign,
  Droplet,
  Gem,
  TrendingUp,
} from 'lucide-react-native';

import { FintechTheme } from '@/constants/fintechTheme';
import type { AssetCategory, MarketSymbol } from '@/types/market';

interface AssetIconProps {
  symbol: MarketSymbol;
  category: AssetCategory;
  size?: number;
}

export const AssetIcon: React.FC<AssetIconProps> = ({ symbol, category, size = 38 }) => {
  const iconSize = Math.round(size * 0.52);

  // Sembol veya kategoriye göre ikon ve renk belirle
  let IconComponent = Building2;
  let color = FintechTheme.colors.accent;
  let bg = FintechTheme.colors.accentSoft;

  if (category === 'gold') {
    IconComponent = Coins;
    color = FintechTheme.colors.gold;
    bg = FintechTheme.colors.goldSoft;
  } else if (category === 'energy' || symbol === 'BZ=F') {
    IconComponent = Droplet;
    color = FintechTheme.colors.energy;
    bg = FintechTheme.colors.energySoft;
  } else if (category === 'currency') {
    if (symbol === 'USDTRY=X') {
      IconComponent = DollarSign;
      color = FintechTheme.colors.up;
      bg = FintechTheme.colors.upSoft;
    } else {
      IconComponent = Banknote;
      color = FintechTheme.colors.accent;
      bg = FintechTheme.colors.accentSoft;
    }
  } else if (category === 'index' || symbol === 'XU100.IS') {
    IconComponent = TrendingUp;
    color = FintechTheme.colors.stock;
    bg = FintechTheme.colors.stockSoft;
  } else if (category === 'stock') {
    IconComponent = Building2;
    color = FintechTheme.colors.stock;
    bg = FintechTheme.colors.stockSoft;
  } else if (category === 'commodity') {
    IconComponent = Gem;
    color = FintechTheme.colors.gold;
    bg = FintechTheme.colors.goldSoft;
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.35),
          backgroundColor: bg,
        },
      ]}
    >
      <IconComponent size={iconSize} color={color} strokeWidth={2.2} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
