module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce structure inside functional React components',
    },
  },

  create(context) {
    return {
      FunctionDeclaration(node) {
        if (!node.id || !/^[A-Z]/.test(node.id.name)) return;

        const body = node.body.body;
        let lastSeen = 0;

        const getBlockType = (stmt) => {
          if (stmt.type === 'VariableDeclaration') {
            const isHook = stmt.declarations.some(
              (d) =>
                d.init &&
                d.init.type === 'CallExpression' &&
                /^use[A-Z]/.test(d.init.callee.name)
            );
            return isHook ? 2 : 1;
          }

          if (
            stmt.type === 'FunctionDeclaration' ||
            stmt.type === 'FunctionExpression'
          ) {
            return 3;
          }

          if (stmt.type === 'ReturnStatement') {
            return 4;
          }

          return 0;
        };

        body.forEach((stmt) => {
          const typeOrder = getBlockType(stmt);
          if (typeOrder < lastSeen && typeOrder !== 0) {
            context.report({
              node: stmt,
              message: `Incorrect block order in component '${node.id.name}'. Expected order: constants → hooks → handlers → return.`,
            });
          }
          if (typeOrder !== 0) lastSeen = typeOrder;
        });
      },
    };
  },
};
