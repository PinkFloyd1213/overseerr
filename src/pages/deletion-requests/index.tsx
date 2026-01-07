import Header from '@app/components/Common/Header';
import PageTitle from '@app/components/Common/PageTitle';
import Button from '@app/components/Common/Button';
import CachedImage from '@app/components/Common/CachedImage';
import Tooltip from '@app/components/Common/Tooltip';
import { useUser, Permission } from '@app/hooks/useUser';
import useSWR, { mutate } from 'swr';
import axios from 'axios';
import Link from 'next/link';
import { CheckIcon, XMarkIcon, NoSymbolIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';

const DeletionRequestsPage = () => {
  const { user, hasPermission } = useUser();
  const { data: requests } = useSWR('/api/v1/deletion-request');

  const handleVote = async (id: number, approve: boolean) => {
    try {
      await axios.post(`/api/v1/deletion-request/${id}/vote`, { approve });
      mutate('/api/v1/deletion-request');
    } catch (e) {
      console.error("Vote failed", e);
    }
  };

  const handleAdminAction = async (id: number, action: 'approve' | 'decline') => {
    try {
      if (action === 'approve') {
        await axios.post(`/api/v1/deletion-request/${id}/approve`);
      } else {
        await axios.delete(`/api/v1/deletion-request/${id}`);
      }
      mutate('/api/v1/deletion-request');
    } catch (e) {
      console.error("Admin action failed", e);
    }
  };

  return (
    <>
      <PageTitle title="Community Deletion Requests" />
      <div className="flex flex-col gap-4 p-4">
        <Header>Deletion Requests</Header>

        {requests?.length === 0 && (
          <div className="flex h-64 w-full flex-col items-center justify-center space-y-4 rounded-lg bg-gray-800 p-6 text-gray-400">
            <span className="text-xl">No active deletion requests.</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {requests?.map((req: any) => {
            const isProcessing = req.status === 1; // 1 = APPROVED
            const hasVoted = req.votes.some((v: any) => v.user.id === user?.id);
            const yesVotes = req.votes.filter((v: any) => v.approve);
            const noVotes = req.votes.filter((v: any) => !v.approve);

            const allVotesSorted = [...req.votes].sort((a, b) => (a.approve === b.approve ? 0 : a.approve ? -1 : 1));
            const displayVotes = allVotesSorted.slice(0, 5);
            const remainingVotes = req.votes.length - displayVotes.length;

            const totalUsers = req.totalUsers || 1;
            const yesPercent = (yesVotes.length / totalUsers) * 100;
            const noPercent = (noVotes.length / totalUsers) * 100;

            const mediaLink = req.media.mediaType === 'movie'
              ? `/movie/${req.media.tmdbId}`
              : `/tv/${req.media.tmdbId}`;

            return (
              <div key={req.id} className={`relative flex flex-col overflow-hidden rounded-xl bg-gray-900 shadow-lg transition duration-300 hover:ring-2 hover:ring-gray-500 ${isProcessing ? 'opacity-80 ring-1 ring-green-500/50' : ''}`}>
                <div className="relative aspect-[2/3] w-full">
                  <Link href={mediaLink}>
                    <a className="block h-full w-full">
                      {req.media.posterPath ? (
                        <CachedImage
                          src={`https://image.tmdb.org/t/p/w600_and_h900_bestv2${req.media.posterPath}`}
                          alt={req.media.title}
                          layout="fill"
                          objectFit="cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-800 text-gray-500">
                          No Poster
                        </div>
                      )}
                    </a>
                  </Link>

                  <div className="absolute top-2 right-2 z-10">
                     <span className={`rounded-md px-2 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-md ${isProcessing ? 'bg-green-600/90' : 'bg-red-600/90'}`}>
                       {isProcessing ? 'PROCESSING DELETION' : 'DELETION REQUEST'}
                     </span>
                  </div>

                  {!isProcessing && hasPermission(Permission.MANAGE_DELETION_REQUESTS) && (
                    <div className="absolute top-2 left-2 z-20 flex gap-2">
                      <Tooltip content="Validate Deletion (Admin Only)">
                        <button
                          onClick={() => handleAdminAction(req.id, 'approve')}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white shadow-lg ring-1 ring-white/20 transition hover:bg-green-500 hover:scale-110"
                        >
                          <CheckBadgeIcon className="h-5 w-5" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Reject Request (Admin Only)">
                        <button
                          onClick={() => handleAdminAction(req.id, 'decline')}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-white shadow-lg ring-1 ring-white/20 transition hover:bg-gray-500 hover:scale-110"
                        >
                          <NoSymbolIcon className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </div>

                <div
                  className="absolute bottom-0 w-full bg-gray-900/70 backdrop-blur-xl p-4 pt-8"
                  style={{
                    maskImage: 'linear-gradient(to bottom, transparent, black 3rem)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 3rem)'
                  }}
                >
                  <Link href={mediaLink}>
                    <a className="mb-1 block truncate text-lg font-bold text-white hover:text-indigo-400 drop-shadow-sm">
                      {req.media.title || 'Loading...'}
                    </a>
                  </Link>
                  <div className="mb-3 text-xs text-gray-300">
                    Requested by <span className="font-semibold text-white">{req.requestedBy.displayName}</span>
                  </div>

                  <div className="mb-2 flex h-2 w-full overflow-hidden rounded-full bg-gray-700/50">
                    <div style={{ width: `${yesPercent}%` }} className="bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] transition-all duration-500" />
                    <div style={{ width: `${noPercent}%` }} className="bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-all duration-500" />
                  </div>

                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-300">
                      {yesVotes.length} Yes &middot; {noVotes.length} No
                    </div>

                    <div className="flex -space-x-2 py-1 pl-2">
                      {displayVotes.map((v: any) => (
                        <Tooltip key={v.id} content={`${v.user.displayName} voted ${v.approve ? 'Yes' : 'No'}`}>
                          <img
                            className={`inline-block h-7 w-7 rounded-full ring-2 ${v.approve ? 'ring-green-500' : 'ring-red-500'} bg-gray-800 object-cover`}
                            src={v.user.avatar}
                            alt={v.user.displayName}
                          />
                        </Tooltip>
                      ))}
                      {remainingVotes > 0 && (
                         <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-[10px] font-bold text-gray-300 ring-2 ring-gray-700">
                           +{remainingVotes}
                         </div>
                      )}
                    </div>
                  </div>

                  {!isProcessing && !hasVoted && hasPermission(Permission.REQUEST_DELETION) && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button buttonType="success" buttonSize="sm" onClick={() => handleVote(req.id, true)}>
                        <CheckIcon className="mr-1 h-4 w-4" />
                        Agree
                      </Button>
                      <Button buttonType="danger" buttonSize="sm" onClick={() => handleVote(req.id, false)}>
                        <XMarkIcon className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {!isProcessing && hasVoted && (
                    <div className="rounded bg-white/10 py-2 text-center text-sm font-medium text-white backdrop-blur-sm">
                      Vote Submitted
                    </div>
                  )}

                  {isProcessing && (
                    <div className="flex items-center justify-center space-x-2 rounded bg-green-500/20 py-2 text-sm font-bold text-green-100 backdrop-blur-sm">
                      <CheckBadgeIcon className="h-5 w-5" />
                      <span>Deletion Validated</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default DeletionRequestsPage;
