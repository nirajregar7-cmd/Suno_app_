import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sunoRouter from "./suno";
import pushRouter from "./push";
import adminRouter from "./admin";
import cashfreeRouter from "./cashfree";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sunoRouter);
router.use("/push", pushRouter);
router.use(adminRouter);
router.use(cashfreeRouter);

export default router;
