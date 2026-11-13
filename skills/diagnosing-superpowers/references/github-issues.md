# GitHub issue

`gh` 已安装并已认证时就用 `gh`；它处理认证、限流和 JSON。退而求其次用 curl 调公开 API，
再不行就给出一个让你的伙伴自己打开的 URL。

本 fork 的会话问题先提到 jnMetaCode/superpowers-zh；维护者确认与翻译无关、是上游行为时再转报 obra/superpowers。

## 搜索

```bash
gh search issues --repo jnMetaCode/superpowers-zh --limit 10 "<terms>" \
  --json number,state,title --jq '.[] | "\(.number)\t\(.state)\t\(.title)"'
```

没有 `gh` 时（未认证，每分钟 10 次请求）：

```bash
curl -s -H "Accept: application/vnd.github+json" \
  "https://api.github.com/search/issues?q=repo:jnMetaCode/superpowers-zh+is:issue+<url-encoded terms>&per_page=10" \
  | jq -r '.items[] | "\(.number)\t\(.state)\t\(.title)"'
```

没有 curl 时，交给对方 `https://github.com/jnMetaCode/superpowers-zh/issues?q=<terms>`。

## 提交

把 `templates/issue.md` 填入工作区。提交者信息只写已知事实，附上人类伙伴的原始请求；
真人摘要由人类伙伴自己填写，代理不能代写或把自己的摘要标为真人撰写。
尚无真人摘要时，交付完整的其余草稿并指出待填位置；**即使伙伴批准了带占位文字的全文，也不提交。**
获得真人摘要后将其原文放入草稿，展示最终确切文本，批准后才提交。

隔离复现只记录实际执行的操作与观察；未测试就写“未尝试”，不勾选确认框，不推断因果。
提交前核对提交者信息与真人摘要已填写、占位内容已清除。获得最终文本批准后：

```bash
gh issue create --repo jnMetaCode/superpowers-zh --title "<title>" --body-file <path> \
  --label bug --label automated-issue-report
```

提交者没有推送权限时，GitHub 会静默丢弃标签，所以只有协作者提交时标签才会生效；
模板页脚仍会标明这条 issue 是由技能提交的。`gh` 不能附加文件：issue 创建后，
把打包材料的路径给你的伙伴，让他们通过浏览器附上。

没有 `gh` 时，同样先完成真人摘要与全文批准，再给出基于 `bug_report.md` 模板的预填链接：

```
https://github.com/jnMetaCode/superpowers-zh/issues/new?template=bug_report.md&title=<url-encoded title>&body=<url-encoded body>
```

GitHub 会拒绝超过约 8,000 个字符的 URL；超过时，只带标题发送链接，并告诉你的伙伴
从文件里粘贴正文。
