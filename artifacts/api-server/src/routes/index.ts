import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import contactsRouter from "./contacts";
import sosRouter from "./sos";
import locationRouter from "./location";
import mediaRouter from "./media";
import incidentsRouter from "./incidents";
import respondersRouter from "./responders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(contactsRouter);
router.use(sosRouter);
router.use(locationRouter);
router.use(mediaRouter);
router.use(incidentsRouter);
router.use(respondersRouter);

export default router;
