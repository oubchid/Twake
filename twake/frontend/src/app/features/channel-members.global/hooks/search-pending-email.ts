import { useRecoilValue } from "recoil";
import { SearchChannelMemberInputState } from "../state/search-channel-member";
import { useChannelPendingEmails } from "./pending-emails-hook";

export const useSearchChannelPendingEmail = () => {

    const searchInput = useRecoilValue(SearchChannelMemberInputState);
    const { pendingEmails } = useChannelPendingEmails();
    let filteredList = pendingEmails;

    if(searchInput) {
        filteredList = pendingEmails.filter(({email}) => {
            return searchInput.split(' ').every(_ => {
                return email.includes(searchInput);
            })
        });
    }

    return {
        filteredPendingEmails: filteredList
    };
}