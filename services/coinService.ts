import apiClient from '@/config/api';

export interface CoinTransaction {
  id: number;
  user_id: number;
  transaction_type: 'earned' | 'spent' | 'purchased' | 'bonus';
  amount: number;
  description: string;
  reference_id?: number;
  timestamp: string;
}

export interface CoinPackage {
  id: string;
  coins: number;
  price: number;
  popular: boolean;
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
    package: {
      id: string;
      coins: number;
      price: number;
    };
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
      const response = await apiClient.get('/coins/balance');
      
      if (response.data.success) {
        return response.data.data.balance;
      }
      
      return 0;
    } catch (error) {
      console.error('Error fetching coin balance:', error);
      throw error;
    }
  }

  async getTransactionHistory(limit = 50, offset = 0, type?: string): Promise<TransactionHistory> {
    try {
      const params: any = { limit, offset };
      if (type) params.type = type;

      const response = await apiClient.get('/coins/transactions', { params });
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to fetch transaction history');
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  async getCoinPackages(): Promise<CoinPackage[]> {
    try {
      const response = await apiClient.get('/coins/packages');
      
      if (response.data.success) {
        return response.data.data.packages;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching coin packages:', error);
      throw error;
    }
  }

  async purchaseCoins(packageId: string, paymentMethod = 'credit_card'): Promise<PurchaseResponse> {
    try {
      const response = await apiClient.post('/coins/purchase', {
        package_id: packageId,
        payment_method: paymentMethod
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Error purchasing coins:', error);
      throw new Error(error.response?.data?.error || 'Failed to purchase coins');
    }
  }

  async earnFreeCoins(adType = 'rewarded'): Promise<FreeCoinsResponse> {
    try {
      const response = await apiClient.post('/coins/free-coins', {
        ad_type: adType
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Error earning free coins:', error);
      throw new Error(error.response?.data?.error || 'Failed to earn free coins');
    }
  }

  async stopAds(): Promise<{ success: boolean; message: string; data: any }> {
    try {
      const response = await apiClient.post('/coins/stop-ads');
      return response.data;
    } catch (error: any) {
      console.error('Error stopping ads:', error);
      throw new Error(error.response?.data?.error || 'Failed to stop ads');
    }
  }
}

export default CoinService.getInstance();