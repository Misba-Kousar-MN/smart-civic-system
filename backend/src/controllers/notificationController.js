const { createUserClient } = require('../config/supabase');
const ApiError = require('../errors/apiError');

/**
 * GET /notifications
 * List notifications for the authenticated user
 */
async function getNotifications(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const offset = (page - 1) * limit;
    const unreadOnly = req.query.unread_only === 'true' || req.query.unread_only === true;

    const userClient = createUserClient(req.token);

    let query = userClient
      .from('notifications')
      .select('id, user_id, title, message, is_read, created_at', { count: 'exact' })
      .eq('user_id', req.user.id);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: notifications, count, error } = await query;

    if (error) {
      throw ApiError.internal('DB_UNEXPECTED', error.message);
    }

    // Get unread count
    const { count: unreadCount } = await userClient
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    return res.status(200).json({
      success: true,
      data: {
        notifications: notifications || [],
        unread_count: unreadCount || 0,
        pagination: {
          page: page,
          limit: limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /notifications/:notificationId/read
 * Mark single notification as read
 */
async function markNotificationAsRead(req, res, next) {
  try {
    const { notificationId } = req.params;
    const userClient = createUserClient(req.token);

    const { data: notification, error: fetchErr } = await userClient
      .from('notifications')
      .select('id, user_id')
      .eq('id', notificationId)
      .single();

    if (fetchErr || !notification) {
      throw ApiError.notFound('NOTIFICATION_NOT_FOUND', `Notification with ID '${notificationId}' not found.`);
    }

    if (notification.user_id !== req.user.id) {
      throw ApiError.forbidden('NOTIFICATION_UPDATE_FORBIDDEN', 'Cannot modify notifications belonging to another user.');
    }

    const { data: updated, error: updateErr } = await userClient
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select('id, is_read')
      .single();

    if (updateErr) {
      throw ApiError.internal('DB_UNEXPECTED', updateErr.message);
    }

    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /notifications/read-all
 * Mark all notifications for user as read
 */
async function markAllNotificationsAsRead(req, res, next) {
  try {
    const userClient = createUserClient(req.token);

    const { error } = await userClient
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) {
      throw ApiError.internal('DB_UNEXPECTED', error.message);
    }

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
