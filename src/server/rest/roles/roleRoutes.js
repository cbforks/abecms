import express from 'express';

import {
	getRoles
} from './roleController';

const router = express.Router();

router.get('/', getRoles)

export default router
