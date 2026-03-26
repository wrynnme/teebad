import liff from '@line/liff';
import { useEffect, useState } from 'react';

const Home = () => {
  const [profile, setProfile] = useState<{ displayName: string } | null>(null);
  useEffect(() => {
    const initLiff = async () => {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        console.error('NEXT_PUBLIC_LIFF_ID is not set');
        return;
      }
      await liff.init({ liffId });

      if (liff.isInClient()) {
        console.log('isInClient');
        const userProfile = await liff.getProfile();
        console.log("🚀 ~ initLiff ~ userProfile:", userProfile)
        setProfile(userProfile);
      } else {
        liff.login();
        console.log('isNotInClient');
      }
    };

    initLiff();
  }, []);

  return (
    <div>
      {profile ? <p>Welcome {profile.displayName}</p> : <p>Loading...</p>}
    </div>
  );
};

export default Home;