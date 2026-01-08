import TheMovieDb from '@server/api/themoviedb';
import { MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import {
  DeletionRequest,
  DeletionRequestStatus,
} from '@server/entity/DeletionRequest';
import { DeletionVote } from '@server/entity/DeletionVote';
import Media from '@server/entity/Media';
import { User } from '@server/entity/User';
import notificationManager, { Notification } from '@server/lib/notifications';
import { Permission } from '@server/lib/permissions';
import { getSettings } from '@server/lib/settings';
import { isAuthenticated } from '@server/middleware/auth';
import { Router } from 'express';
import { In } from 'typeorm';

const router = Router();

router.use((req, res, next) => {
  const settings = getSettings();
  if (!settings.main.enableDeletionRequests) {
    return next({
      status: 403,
      message: 'Deletion requests are disabled by the administrator.',
    });
  }
  next();
});

router.get('/', isAuthenticated(), async (req, res, next) => {
  const requestRepository = getRepository(DeletionRequest);
  const userRepository = getRepository(User);
  const tmdb = new TheMovieDb();

  try {
    const requests = await requestRepository.find({
      where: {
        status: In([
          DeletionRequestStatus.PENDING,
          DeletionRequestStatus.APPROVED,
        ]),
      },
      relations: ['media', 'requestedBy', 'votes', 'votes.user'],
      order: {
        status: 'ASC',
        createdAt: 'DESC',
      },
    });

    const totalUsers = await userRepository.count();

    const formattedRequests = await Promise.all(
      requests.map(async (req) => {
        let title = 'Unknown Title';
        let posterPath = '';
        let backdropPath = '';

        try {
          if (req.media.mediaType === MediaType.MOVIE) {
            const movie = await tmdb.getMovie({ movieId: req.media.tmdbId });
            title = movie.title;
            posterPath = movie.poster_path ?? '';
            backdropPath = movie.backdrop_path ?? '';
          } else {
            const tv = await tmdb.getTvShow({ tvId: req.media.tmdbId });
            title = tv.name;
            posterPath = tv.poster_path ?? '';
            backdropPath = tv.backdrop_path ?? '';

            if (req.seasonNumber) {
              title += ` - Season ${req.seasonNumber}`;
            }
          }
        } catch (e) {
          console.error(
            `Failed to fetch details for media ${req.media.tmdbId}`,
            e
          );
        }

        return {
          ...req,
          totalUsers,
          media: {
            ...req.media,
            title,
            posterPath,
            backdropPath,
          },
        };
      })
    );

    return res.status(200).json(formattedRequests);
  } catch (e) {
    next({ status: 500, message: e.message });
  }
});

router.post('/:id/vote', isAuthenticated(), async (req, res, next) => {
  const requestRepository = getRepository(DeletionRequest);
  const voteRepository = getRepository(DeletionVote);
  const userRepository = getRepository(User);

  try {
    const request = await requestRepository.findOneOrFail({
      where: { id: Number(req.params.id) },
      relations: ['votes', 'media', 'votes.user'],
    });

    if (request.status !== DeletionRequestStatus.PENDING) {
      return next({ status: 400, message: 'Request is not pending.' });
    }

    const existingVoteIndex = request.votes.findIndex(
      (v) => v.user.id === req.user!.id
    );

    if (existingVoteIndex !== -1) {
      return next({ status: 409, message: 'You have already voted.' });
    }

    const vote = new DeletionVote();
    vote.user = req.user!;
    vote.request = request;
    vote.approve = req.body.approve === true;

    await voteRepository.save(vote);
    request.votes.push(vote);

    const totalUsers = await userRepository.count();
    const positiveVotes = request.votes.filter((v) => v.approve).length;

    if (positiveVotes >= totalUsers) {
      const tmdb = new TheMovieDb();
      let title = '';
      let posterPath = '';

      try {
        if (request.media.mediaType === MediaType.MOVIE) {
          const movie = await tmdb.getMovie({ movieId: request.media.tmdbId });
          title = movie.title;
          posterPath = movie.poster_path ?? '';
        } else {
          const tv = await tmdb.getTvShow({ tvId: request.media.tmdbId });
          title = tv.name;
          posterPath = tv.poster_path ?? '';

          if (request.seasonNumber) {
            title += ` - Season ${request.seasonNumber}`;
          }
        }

        notificationManager.sendNotification(
          Notification.MEDIA_DELETION_CONSENSUS,
          {
            event: 'Deletion Consensus Reached',
            subject: `Deletion Request Approved by Community: ${title}`,
            message: `All active users (${totalUsers}) have voted to delete ${title}.`,
            media: request.media,
            deletionRequest: request,
            notifySystem: true,
            notifyAdmin: true,
            image: posterPath
              ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${posterPath}`
              : undefined,
          }
        );
      } catch (e) {
        console.error('Failed to fetch media details for notification', e);
      }
    }

    return res.status(200).json({
      id: vote.id,
      approve: vote.approve,
      userId: req.user!.id,
    });
  } catch (e) {
    console.error(e);
    next({ status: 500, message: e.message });
  }
});

router.post(
  '/:id/approve',
  isAuthenticated(Permission.ADMIN),
  async (req, res, next) => {
    const requestRepository = getRepository(DeletionRequest);
    const mediaRepository = getRepository(Media);

    try {
      const request = await requestRepository.findOneOrFail({
        where: { id: Number(req.params.id) },
        relations: ['media'],
      });

      request.status = DeletionRequestStatus.APPROVED;
      await requestRepository.save(request);

      if (!request.seasonNumber) {
        await mediaRepository.remove(request.media);
      }

      return res.status(200).json(request);
    } catch (e) {
      next({ status: 500, message: e.message });
    }
  }
);

router.delete(
  '/:id',
  isAuthenticated(Permission.ADMIN),
  async (req, res, next) => {
    const requestRepository = getRepository(DeletionRequest);

    try {
      const request = await requestRepository.findOneOrFail({
        where: { id: Number(req.params.id) },
      });

      request.status = DeletionRequestStatus.DECLINED;
      await requestRepository.save(request);

      return res.status(200).json(request);
    } catch (e) {
      next({ status: 500, message: e.message });
    }
  }
);

export default router;
