import { useRecoilState } from 'recoil';

import {
  AtomChannelMembersKey,
  ChannelMemberType,
} from 'app/features/channel-members/types/channel-member-types';
import { ChannelGuestsState } from 'app/features/channel-members/state/channel-guests';
import { useGlobalEffect } from 'app/features/global/hooks/use-global-effect';
import { LoadingState } from 'app/features/global/state/atoms/Loading';
import ChannelMembersAPIClient from '../api/channel-members-api-client';
import UserAPIClient from 'app/features/users/api/user-api-client';
import { useSetUserList } from 'app/features/users/hooks/use-user-list';

export const useChannelGuests = (
  key: AtomChannelMembersKey,
): {
  channelGuests: ChannelMemberType[];
  loading: boolean;
  refresh: () => Promise<void>;
} => {
  const [channelGuests, _setChannelGuests] = useRecoilState(ChannelGuestsState(key));
  const [loading, setLoading] = useRecoilState(LoadingState(`channel-guests-${key.channelId}`));
  const { set: setUserList } = useSetUserList('useChannelGuests');

  const refresh = async () => {
    const { companyId, workspaceId, channelId } = key;
    const channelGuestsUpdated = await ChannelMembersAPIClient.list(
      {
        companyId,
        workspaceId,
        channelId,
      },
      { role: 'guest' },
    );

    if (channelGuestsUpdated) _setChannelGuests(channelGuestsUpdated);

    // FIX ME Not sure about doing another call to backend here for userList
    const usersIdx = channelGuestsUpdated.map(guest => guest.user_id || '');
    UserAPIClient.list(usersIdx, [companyId], { bufferize: true });
  };

  useGlobalEffect(
    'useChannelGuests',
    async () => {
      if (!channelGuests) setLoading(true);

      await refresh();

      setLoading(false);
    },
    [key, channelGuests],
  );

  return {
    channelGuests,
    loading,
    refresh,
  };
};
