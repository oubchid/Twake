import React, { useEffect, useRef, useState } from 'react';
import { Input, Row, Typography, InputRef } from 'antd';
import PerfectScrollbar from 'react-perfect-scrollbar';

import listService, {
  GenericChannel,
} from 'app/features/global/services/search-list-manager-service';
import Languages from 'app/features/global/services/languages-service';
import Icon from 'app/components/icon/icon';
import ObjectModal from 'components/object-modal/object-modal';
import SearchListContainer from './WorkspaceChannelList/SearchListContainer';
import RouterServices from 'app/features/router/services/router-service';
import ModalManager from 'app/components/modal/modal-manager';
import { UserType } from 'app/features/users/types/user';
import UsersService from 'app/features/users/services/current-user-service';
import { ChannelType } from 'app/features/channels/types/channel';
import { delayRequest } from 'app/features/global/utils/managedSearchRequest';
import ChannelMembersAPIClient from 'app/features/channel-members/api/channel-members-api-client';
import ChannelsReachableAPIClient from 'app/features/channels/api/channels-reachable-api-client';
import { useFavoriteChannels } from 'app/features/channels/hooks/use-favorite-channels';
import { useSetUserList, useUserList } from 'app/features/users/hooks/use-user-list';
import { useSearchUserList } from 'app/features/users/hooks/use-search-user-list';
import useRouterCompany from 'app/features/router/hooks/use-router-company';
import { useDirectChannels } from 'app/features/channels/hooks/use-direct-channels';

export default () => {
  const [search, setSearch] = useState<string>('');
  const [limit, setLimit] = useState(10);
  const [cursor, setCursor] = useState<number>(-1);
  const list = listService.useWatcher(() => listService.list);
  const currentUserId: string = UsersService.getCurrentUserId();
  const inputRef = useRef<InputRef>(null);
  const { refresh: refreshFavoriteChannels } = useFavoriteChannels();
  const { set: setUserList } = useSetUserList('WorkspaceChannelList');
  const { userList } = useUserList();
  const { openDiscussion } = useDirectChannels();

  const { search: searchUserList, result: searchedUserList } = useSearchUserList({
    scope: 'company',
  });

  useEffect(() => {
    listService.searchAll('', { userListState: userList?.map(u => u) });
  }, []);

  useEffect(() => {
    const users = list
      .filter(generic => generic.type === 'user')
      .map(generic => generic.resource as UserType);

    if (users.length) setUserList(users);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowUp' && cursor > 0) {
      return setCursor(cursor - 1);
    }

    if (event.key === 'ArrowDown' && cursor < list.length - 1) {
      if (cursor < limit - 1) return setCursor(cursor + 1);
    }

    if (event.key === 'Enter' && cursor >= 0) {
      const element = list[cursor];
      return element ? handleElementType(element) : null;
    }
  };

  const handleElementType = (element: GenericChannel) => {
    switch (element.type) {
      case 'user':
        return upsertDirectMessage([(element.resource as UserType).id || '', currentUserId]);
      case 'workspace':
        return joinChannel(element.resource as ChannelType);
      case 'direct':
        return upsertDirectMessage((element.resource as ChannelType).members || []);
    }
  };

  const upsertDirectMessage = async (userIds: string[]): Promise<void> => {
    await openDiscussion(userIds);
    return ModalManager.closeAll();
  };

  const joinChannel = async (channel: ChannelType) => {
    if (channel.company_id && channel.workspace_id && channel.id) {
      const channelMembers = await ChannelMembersAPIClient.list({
        companyId: channel.company_id,
        workspaceId: channel.workspace_id,
        channelId: channel.id,
      });

      const alreadyMemberInChannel = channelMembers.map(m => m.user_id)?.includes(currentUserId);

      if (!alreadyMemberInChannel) {
        await ChannelsReachableAPIClient.inviteUser(
          channel.company_id,
          channel.workspace_id,
          channel.id,
          currentUserId,
        ).finally(refreshFavoriteChannels);
      }
    }

    ModalManager.closeAll();
    RouterServices.push(
      RouterServices.generateRouteFromState({
        companyId: channel.company_id,
        workspaceId: channel.workspace_id || '',
        channelId: channel.id,
      }),
    );
  };

  const loadMore = () => {
    setLimit(limit + 10);
    return inputRef.current?.focus();
  };
  return (
    <ObjectModal title={Languages.t('components.channelworkspacelist.title')} closable>
      <Row className="small-bottom-margin x-margin">
        <Input
          suffix={
            <Icon type="search" className="m-icon-small" style={{ color: 'var(--grey-dark)' }} />
          }
          onKeyDown={handleKeyDown}
          placeholder={Languages.t('scenes.client.channelbar.workspacechannellist.autocomplete')}
          value={search}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setSearch(event.target.value);
            event.persist();
            searchUserList(event.target.value);
            delayRequest('channel_members_list_search', () => {
              console.log(`result here for ${event.target.value}`, searchedUserList);
              listService.searchAll(event.target.value, {
                userListState: searchedUserList.map(u => u),
              });
            });

            return setCursor(0);
          }}
          autoFocus
          ref={inputRef}
        />
      </Row>
      <PerfectScrollbar
        style={{ height: '240px' }}
        component="div"
        options={{ suppressScrollX: true, suppressScrollY: false }}
      >
        <SearchListContainer
          list={list}
          active={cursor}
          limit={limit}
          setCursor={(index: number) => setCursor(index)}
        />
        {list.length > limit && (
          <Row justify="center" style={{ lineHeight: '32px', marginBottom: '16px' }}>
            <Typography.Link onClick={loadMore}>
              {Languages.t(
                'scenes.client.channelsbar.modals.workspace_channel_list.workspace_channel_row.loader',
              )}
            </Typography.Link>
          </Row>
        )}
      </PerfectScrollbar>
    </ObjectModal>
  );
};
