import { supabase, CoinTransaction } from '@/config/supabase';
import * as InAppPurchases from 'expo-in-app-purchases';

export interface CoinPackage {
  id: string;
  coins: number;
  price: number;
  popular: boolean;
  product_id: string;
}

export interface CoinBalance {
  balance: number;
}

export interface TransactionHistory {
  transactions: CoinTransaction[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  stats: {
    total_earned: number;
    total_spent: number;
    total_purchased: number;
  };
}

export interface PurchaseResponse {
  success: boolean;
  message: string;
  data: {
    coins_added: number;
    new_balance: number;
    package: CoinPackage;
  };
}

export interface FreeCoinsResponse {
  success: boolean;
  message: string;
  data: {
    coins_earned: number;
    new_balance: number;
    ad_type: string;
  };
}

class CoinService {
  private static instance: CoinService;

  static getInstance(): CoinService {
    if (!CoinService.instance) {
      CoinService.instance = new CoinService();
    }
    return CoinService.instance;
  }

  async getBalance(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userProfile, error } = await supabase
        .from('users')
        .select('coin_balance')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      return userProfile.coin_balance || 0;
    } catch (error) {
      console.error('Error fetching coin balance:', error);
      throw error;
    }
  }

  async getTransactionHistory(limit = 50, offset = 0, type?: string): Promise<TransactionHistory> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('coin_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (type && ['earned', 'spent', 'purchased', 'bonus'].includes(type)) {
        query = query.eq('transaction_type', type);
      }

      const { data: transactions, error, count } = await query;

      if (error) throw error;

      // Get summary stats
      const { data: stats, error: statsError } = await supabase
        .from('coin_transactions')
        .select('transaction_type, amount')
        .eq('user_id', user.id);

      if (statsError) throw statsError;

      const summary = stats?.reduce((acc, transaction) => {
        switch (transaction.transaction_type) {
          case 'earned':
            acc.total_earned += transaction.amount;
            break;
          case 'spent':
            acc.total_spent += transaction.amount;
            break;
          case 'purchased':
            acc.total_purchased += transaction.amount;
            break;
        }
        return acc;
      }, { total_earned: 0, total_spent: 0, total_purchased: 0 }) || 
      { total_earned: 0, total_spent: 0, total_purchased: 0 };

      return {
        transactions: transactions || [],
        pagination: {
          total: count || 0,
          limit,
          offset,
          has_more: (offset + (transactions?.length || 0)) < (count || 0)
        },
        stats: summary
      };
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  async getCoinPackages(): Promise<CoinPackage[]> {
    const packages: CoinPackage[] = [
      { id: 'small', coins: 100, price: 0.99, popular: false, product_id: 'com.vidgro.coins.100' },
      { id: 'medium', coins: 500, price: 3.99, popular: true, product_id: 'com.vidgro.coins.500' },
      { id: 'large', coins: 1000, price: 6.99, popular: false, product_id: 'com.vidgro.coins.1000' },
      { id: 'mega', coins: 2500, price: 14.99, popular: false, product_id: 'com.vidgro.coins.2500' }
    ];

    return packages;
  }

  async purchaseCoins(packageId: string): Promise<PurchaseResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const packages = await this.getCoinPackages();
      const selectedPackage = packages.find(p => p.id === packageId);
      
      if (!selectedPackage) {
        throw new Error('Invalid package selected');
      }

      // Initialize in-app purchases
      await InAppPurchases.connectAsync();

      // Get products
      const { results: products } = await InAppPurchases.getProductsAsync([selectedPackage.product_id]);
      
      if (products.length === 0) {
        throw new Error('Product not available');
      }

      // Make purchase
      const { results: purchases } = await InAppPurchases.purchaseItemAsync(selectedPackage.product_id);
      
      if (purchases.length > 0 && purchases[0].acknowledged) {
        // Purchase successful, add coins using RPC
        const { data: result, error } = await supabase.rpc('add_coins_purchase', {
          p_user_id: user.id,
          p_amount: selectedPackage.coins,
          p_description: `Purchased ${selectedPackage.id} package ($${selectedPackage.price})`
        });

        if (error) throw error;

        return {
          success: true,
          message: 'Coins purchased successfully',
          data: {
            coins_added: selectedPackage.coins,
            new_balance: result.new_balance,
            package: selectedPackage
          }
        };
      } else {
        throw new Error('Purchase was not completed');
      }
    } catch (error: any) {
      console.error('Error purchasing coins:', error);
      throw new Error(error.message || 'Failed to purchase coins');
    } finally {
      await InAppPurchases.disconnectAsync();
    }
  }

  async earnFreeCoins(adType = 'rewarded'): Promise<FreeCoinsResponse> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if user has watched an ad recently (limit to once per hour)
      const { data: recentAd } = await supabase
        .from('ad_sessions')
        .select('timestamp')
        .eq('user_id', user.id)
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .single();

      if (recentAd) {
        const nextAvailable = new Date(new Date(recentAd.timestamp).getTime() + 60 * 60 * 1000);
        throw new Error(`You can only watch one ad per hour. Next available: ${nextAvailable.toLocaleTimeString()}`);
      }

      // Random coins between 150-400
      const coinsEarned = Math.floor(Math.random() * 251) + 150;

      // Use RPC to add coins and record ad session
      const { data: result, error } = await supabase.rpc('earn_free_coins', {
        p_user_id: user.id,
        p_coins_earned: coinsEarned,
        p_ad_type: adType
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Free coins earned successfully',
        data: {
          coins_earned: coinsEarned,
          new_balance: result.new_balance,
          ad_type: adType
        }
      };
    } catch (error: any) {
      console.error('Error earning free coins:', error);
      throw new Error(error.message || 'Failed to earn free coins');
    }
  }

  async stopAds(): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const cost = 50;

      // Use RPC to stop ads
      const { data: result, error } = await supabase.rpc('stop_ads', {
        p_user_id: user.id,
        p_cost: cost
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Ads stopped for 6 hours',
        data: {
          new_balance: result.new_balance,
          ads_stopped_until: result.ads_stopped_until,
          cost
        }
      };
    } catch (error: any) {
      console.error('Error stopping ads:', error);
      throw new Error(error.message || 'Failed to stop ads');
    }
  }
}

export default CoinService.getInstance();