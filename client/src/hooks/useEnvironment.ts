// ========================================
// ✅ LOCALHOST ONLY - useEnvironment.ts
// File: client/src/hooks/useEnvironment.ts
// ✅ NO REMOTE URLs - ONLY localhost:3001 and localhost:3002
// ========================================

import { useState, useEffect, useCallback } from 'react';

export type Environment = 'dev' | 'prod';

interface EnvironmentConfig {
  name: string;
  displayName: string;
  url: string; // ✅ واحد فقط - localhost
}

// ✅ LOCALHOST ONLY - NO REMOTE URLS
const ENVIRONMENTS: Record<Environment, EnvironmentConfig> = {
  dev: {
    name: 'dev',
    displayName: 'Development',
    url: 'http://localhost:3001', // ✅ فقط localhost
  },
  prod: {
    name: 'prod',
    displayName: 'Production',
    url: 'http://localhost:3002', // ✅ فقط localhost
  },
};

// ====================================
// ✅ كشف البيئة من port فقط
// ====================================
function detectEnvironment(): Environment {
  const port = window.location.port;
  
  console.log('🔍 [detectEnvironment] Port:', port);
  
  // ✅ بسيط جداً - فقط فحص الـ port
  if (port === '3001') {
    console.log('✅ Environment: dev (3001)');
    return 'dev';
  }
  
  if (port === '3002') {
    console.log('✅ Environment: prod (3002)');
    return 'prod';
  }
  
  // Default to dev
  console.warn('⚠️ Unknown port, defaulting to dev');
  return 'dev';
}

// ====================================
// ✅ بناء URL - بسيط جداً
// ====================================
function buildTargetUrl(targetEnv: Environment, keepPath: boolean = true): string {
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  const currentHash = window.location.hash;

  const config = ENVIRONMENTS[targetEnv];
  const baseUrl = config.url; // ✅ localhost فقط

  let targetUrl: string;
  if (keepPath) {
    targetUrl = `${baseUrl}${currentPath}${currentSearch}${currentHash}`;
  } else {
    targetUrl = baseUrl;
  }

  console.log('🎯 [buildTargetUrl]:', {
    targetEnv,
    baseUrl,
    currentPath,
    targetUrl,
  });

  return targetUrl;
}

// ====================================
// ✅ Hook الرئيسي - مبسط
// ====================================
export function useEnvironment() {
  const [current, setCurrent] = useState<Environment>(() => detectEnvironment());
  const [isSwitching, setIsSwitching] = useState(false);

  // تحديث عند تغيير URL
  useEffect(() => {
    const handleChange = () => {
      const newEnv = detectEnvironment();
      console.log(`🔄 [popstate] Environment changed to: ${newEnv}`);
      setCurrent(newEnv);
    };
    
    window.addEventListener('popstate', handleChange);
    return () => window.removeEventListener('popstate', handleChange);
  }, []);

  /**
   * ✅ التبديل - بسيط ومباشر
   */
  const switchEnvironment = useCallback((
    targetEnv: Environment, 
    keepPath: boolean = true
  ) => {
    console.group('🔄 [switchEnvironment]');
    
    // لا تبدل إذا كنا بالفعل في البيئة المستهدفة
    if (targetEnv === current) {
      console.log(`ℹ️ Already on ${targetEnv}`);
      console.groupEnd();
      return;
    }

    console.log(`From: ${current} (port ${current === 'dev' ? '3001' : '3002'})`);
    console.log(`To: ${targetEnv} (port ${targetEnv === 'dev' ? '3001' : '3002'})`);

    setIsSwitching(true);

    try {
      const targetUrl = buildTargetUrl(targetEnv, keepPath);

      console.log(`🎯 Target URL: ${targetUrl}`);

      // التحقق من صحة الـ URL
      if (!targetUrl || targetUrl === window.location.href) {
        throw new Error('Invalid target URL');
      }

      // حفظ التفضيل
      localStorage.setItem('preferredEnvironment', targetEnv);
      console.log('💾 Saved to localStorage');

      console.log('🚀 Starting navigation...');

      // ✅ Method 1: window.location.replace()
      try {
        console.log('   → Method 1: window.location.replace()');
        window.location.replace(targetUrl);
        console.log('   ✅ Navigation initiated');
        return;
      } catch (e) {
        console.warn('   ⚠️ Method 1 failed:', e);
      }

      // ✅ Method 2: window.location.href
      try {
        console.log('   → Method 2: window.location.href');
        window.location.href = targetUrl;
        console.log('   ✅ Navigation initiated');
        return;
      } catch (e) {
        console.warn('   ⚠️ Method 2 failed:', e);
      }

      // ✅ Method 3: window.location.assign()
      try {
        console.log('   → Method 3: window.location.assign()');
        window.location.assign(targetUrl);
        console.log('   ✅ Navigation initiated');
        return;
      } catch (e) {
        console.error('   ❌ Method 3 failed:', e);
        throw new Error('All navigation methods failed');
      }

    } catch (err) {
      console.error('❌ [switchEnvironment] ERROR:', err);
      setIsSwitching(false);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`فشل التبديل: ${errorMessage}\n\nتأكد من أن السيرفر الآخر يعمل!`);
      
      throw err;
    } finally {
      console.groupEnd();
    }
  }, [current]);

  /**
   * ✅ اختصارات
   */
  const switchToDev = useCallback(() => {
    console.log('🎯 [switchToDev] → localhost:3001');
    switchEnvironment('dev');
  }, [switchEnvironment]);

  const switchToProd = useCallback(() => {
    console.log('🎯 [switchToProd] → localhost:3002');
    switchEnvironment('prod');
  }, [switchEnvironment]);

  return {
    // معلومات البيئة
    current,
    isDev: current === 'dev',
    isProd: current === 'prod',
    
    // دوال التبديل
    switchEnvironment,
    switchToDev,
    switchToProd,
    
    // حالة التحميل
    isSwitching,
    
    // الحصول على المعلومات
    getConfig: (env: Environment) => ENVIRONMENTS[env],
    getCurrentPort: () => current === 'dev' ? '3001' : '3002',
    getTargetPort: (env: Environment) => env === 'dev' ? '3001' : '3002',
  };
}

// ====================================
// ✅ دوال مساعدة
// ====================================

export function getCurrentEnvironment(): Environment {
  return detectEnvironment();
}

export function isDevEnvironment(): boolean {
  return window.location.port === '3001';
}

export function isProdEnvironment(): boolean {
  return window.location.port === '3002';
}

export function getCurrentPort(): string {
  return window.location.port;
}
