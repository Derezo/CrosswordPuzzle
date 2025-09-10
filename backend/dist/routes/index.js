"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const puzzle_1 = __importDefault(require("./puzzle"));
const leaderboard_1 = __importDefault(require("./leaderboard"));
const achievement_1 = __importDefault(require("./achievement"));
const suggestion_1 = __importDefault(require("./suggestion"));
const categories_1 = __importDefault(require("./categories"));
const router = (0, express_1.Router)();
// Mount route modules
router.use('/auth', auth_1.default);
router.use('/puzzle', puzzle_1.default);
router.use('/leaderboard', leaderboard_1.default);
router.use('/achievement', achievement_1.default);
router.use('/suggestion', suggestion_1.default);
router.use('/categories', categories_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map