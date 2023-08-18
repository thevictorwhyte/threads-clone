import CommunityCard from '@/components/cards/CommunityCard';
import UserCard from '@/components/cards/UserCard';
import Searchbar from '@/components/shared/Searchbar';
import {fetchCommunities} from '@/lib/actions/community.actions';
import {fetchUser, fetchUsers} from '@/lib/actions/user.actions';
import {currentUser} from '@clerk/nextjs';
import {redirect} from 'next/navigation';

const Page = async ({
  searchParams,
}: {
  searchParams: {[key: string]: string | undefined};
}) => {
  const user = await currentUser();

  if (!user) return null;

  const userInfo = await fetchUser(user.id);

  if (!userInfo?.onboarded) redirect('/onboarding');

  // Fetch Communities
  const result = await fetchCommunities({
    searchString: searchParams.q,
    pageNumber: searchParams?.page ? +searchParams.page : 1,
    pageSize: 25,
  });
  return (
    <section>
      <h1 className="head-text mb-10">Search</h1>
      {/* Search bar */}
      <div className="mt-5">
        <Searchbar routeType="communities" />
      </div>
      <div className="mt-9 flex flex-wrap gap-4">
        {result.communities.length === 0 ? (
          <p className="no-result">No communities</p>
        ) : (
          <>
            {result.communities.map(community => {
              return (
                <CommunityCard
                  key={community.id}
                  id={community.id}
                  name={community.name}
                  username={community.username}
                  imgUrl={community.image}
                  bio={community.bio}
                  members={community.members}
                />
              );
            })}
          </>
        )}
      </div>
    </section>
  );
};

export default Page;
