"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _default = async (bp, analytics) => {
  const router = bp.http.createRouterForBot('analytics');
  router.get('/graphs', async (req, res) => {
    const graphData = await analytics.getChartsGraphData();
    res.send(graphData);
  });
  router.get('/metadata', async (req, res) => {
    const metadata = await analytics.getAnalyticsMetadata();
    res.send(metadata);
  });
  router.get('/custom_metrics', async (req, res) => {
    const metrics = await bp.analytics.custom.getAll(req.query.from, req.query.to);
    res.send(metrics);
  });
};

exports.default = _default;